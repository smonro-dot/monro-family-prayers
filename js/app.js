(function () {
  const CACHE_NAME = "monro-prayers-v1";
  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const NAV = [
    ["home", "Home", "#/home"],
    ["night", "Night", "#/night"],
    ["morning", "Morning", "#/morning"],
    ["rosary", "Rosary", "#/rosary"],
    ["common", "Common", "#/common"]
  ];

  const content = document.querySelector("#content");
  const nav = document.querySelector("#nav");
  const statusEl = document.querySelector("#offline-status");
  const dock = document.querySelector("#dock");
  const audio = document.querySelector("#prayer-audio");
  const dockTitle = document.querySelector("#dock-title");
  const dockState = document.querySelector("#dock-state");
  const dockToggle = document.querySelector("#dock-toggle");

  let catalog = null;
  let catalogById = new Map();
  let renderToken = 0;

  function pageBase() {
    return new URL(".", location.href);
  }

  function el(tag, attrs) {
    const node = document.createElement(tag);
    const children = Array.prototype.slice.call(arguments, 2);
    Object.keys(attrs || {}).forEach(function (key) {
      const value = attrs[key];
      if (value == null || value === false) return;
      if (key === "class") node.className = value;
      else node.setAttribute(key, value);
    });
    children.forEach(function (child) {
      if (child == null || child === false) return;
      node.append(child);
    });
    return node;
  }

  function para(text, className) {
    return el("p", { class: className }, text);
  }

  function versicle(kind, text) {
    const node = para("");
    node.append(el("span", { class: "speaker" }, kind === "v" ? "V." : "R."), text);
    return node;
  }

  function verse(number, text) {
    const node = el("p", { class: "verse" });
    node.append(el("sup", {}, String(number)), text);
    return node;
  }

  function todayId() {
    return DAYS[new Date().getDay()];
  }

  function nightById(id) {
    return window.PRAYERS.nights.find(function (night) { return night.id === id; });
  }

  function route() {
    const parts = (location.hash || "#/home").replace(/^#\/?/, "").split("/").filter(Boolean);
    const name = parts[0] || "home";
    if (name === "night") {
      const requested = parts[1];
      const day = nightById(requested) ? requested : todayId();
      return { name: "night", day: day };
    }
    if (name === "morning" || name === "rosary" || name === "common" || name === "home") {
      return { name: name };
    }
    return { name: "home" };
  }

  function renderNav(current) {
    nav.replaceChildren.apply(nav, NAV.map(function (item) {
      const active = item[0] === current;
      return el("a", {
        href: item[2],
        "aria-current": active ? "page" : null
      }, item[1]);
    }));
  }

  function audioFileUrl(entry) {
    if (!entry || typeof entry.file !== "string" || /[\\/]|\.\./.test(entry.file)) return "";
    return new URL(catalog.directory + "/" + entry.file, pageBase()).href;
  }

  async function probe(url) {
    try {
      const resp = await fetch(url, { cache: "reload", headers: { Range: "bytes=0-1" } });
      if (resp.body) {
        const reader = resp.body.getReader();
        while (!(await reader.read()).done) { /* drain the probe */ }
      }
      if (resp.ok) return true;
      if (resp.status === 404 || resp.status === 416) return false;
    } catch (err) {
      /* Offline: use a recording saved on a previous visit. */
    }
    if (!("caches" in window)) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(url);
      return Boolean(hit);
    } catch (err) {
      return false;
    }
  }

  async function prefetchFull(url) {
    const resp = await fetch(url, { cache: "reload", headers: { Accept: "audio/mpeg" } });
    if (!resp.ok || resp.status !== 200 || !resp.body) return false;
    const reader = resp.body.getReader();
    while (!(await reader.read()).done) { /* let the service worker store the full file */ }
    return true;
  }

  function missingNote(entry) {
    const note = el("p", {
      class: "missing",
      "data-audio-id": entry.id,
      "data-audio-state": "missing",
      role: "status"
    });
    note.append(
      "No recording yet. Add ",
      el("code", {}, "audio/" + entry.file),
      ". Keep that filename and no code change is needed."
    );
    return note;
  }

  function readyNote(entry) {
    return el("p", {
      class: "lede",
      "data-audio-id": entry.id,
      "data-audio-state": "ready"
    }, "Recording ready. Press play. It keeps going if the phone locks after you start it.");
  }

  function playButton(entry) {
    const button = el("button", {
      type: "button",
      class: "inline-play",
      "data-audio-id": entry.id,
      "data-audio-state": "ready"
    }, "Play " + entry.title);
    button.addEventListener("click", function () {
      loadAndPlay(entry);
    });
    return button;
  }

  async function slot(entry, primary) {
    if (!entry) {
      return para("This recording is not listed in the audio catalog.", "missing");
    }
    const url = audioFileUrl(entry);
    const ok = url ? await probe(url) : false;
    if (!ok) return missingNote(entry);
    if (primary) return readyNote(entry);
    return playButton(entry);
  }

  function silenceDock() {
    dock.hidden = true;
    dock.dataset.state = "idle";
    document.body.classList.remove("has-player");
    audio.pause();
    audio.removeAttribute("src");
    delete audio.dataset.url;
    audio.load();
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.metadata = null;
      } catch (err) { /* some browsers reject a null metadata */ }
    }
  }

  async function showDock(entry) {
    const url = audioFileUrl(entry);
    dock.hidden = false;
    document.body.classList.add("has-player");
    dockTitle.textContent = entry.title;
    dock.dataset.state = "ready";
    dockState.textContent = "Loading recording…";
    dockToggle.textContent = "Play";
    audio.dataset.title = entry.title;
    audio.dataset.album = entry.album;
    audio.dataset.prayerId = entry.id;
    if (audio.dataset.url !== url) {
      const stored = await prefetchFull(url);
      if (!stored) throw new Error("recording was not stored");
      audio.dataset.url = url;
      audio.src = url;
      await new Promise(function (resolve, reject) {
        if (audio.readyState >= 2) {
          resolve();
          return;
        }
        const ok = function () { cleanup(); resolve(); };
        const bad = function () { cleanup(); reject(new Error("audio failed")); };
        const cleanup = function () {
          audio.removeEventListener("loadeddata", ok);
          audio.removeEventListener("error", bad);
        };
        audio.addEventListener("loadeddata", ok);
        audio.addEventListener("error", bad);
      });
    }
    if (audio.paused) {
      dockState.textContent = "Ready";
      dock.dataset.state = "ready";
    }
  }

  async function loadAndPlay(entry) {
    try {
      await showDock(entry);
      await audio.play();
    } catch (err) {
      dockState.textContent = "Could not play";
    }
  }

  function setMediaSession() {
    document.body.dataset.mediaTitle = audio.dataset.title || "";
    if ("audioSession" in navigator) {
      try { navigator.audioSession.type = "playback"; } catch (err) { /* unsupported */ }
    }
    document.body.dataset.audioSession = ("audioSession" in navigator && navigator.audioSession)
      ? navigator.audioSession.type
      : "unsupported";
    if (!("mediaSession" in navigator)) return;
    const base = pageBase();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: audio.dataset.title || "Prayer",
      artist: catalog ? catalog.artist : "Monro Family Prayers",
      album: audio.dataset.album || "Monro Family Prayers",
      artwork: [
        { src: new URL("icons/icon-192.png", base).href, sizes: "192x192", type: "image/png" },
        { src: new URL("icons/icon-512.png", base).href, sizes: "512x512", type: "image/png" }
      ]
    });
    navigator.mediaSession.playbackState = "playing";
    const actions = {
      play: function () { return audio.play(); },
      pause: function () { audio.pause(); },
      stop: function () { audio.pause(); audio.currentTime = 0; },
      seekbackward: function (details) {
        const skip = details && details.seekOffset ? details.seekOffset : 10;
        audio.currentTime = Math.max(0, audio.currentTime - skip);
      },
      seekforward: function (details) {
        const skip = details && details.seekOffset ? details.seekOffset : 10;
        const cap = Number.isFinite(audio.duration) ? audio.duration : audio.currentTime + skip;
        audio.currentTime = Math.min(cap, audio.currentTime + skip);
      }
    };
    Object.keys(actions).forEach(function (name) {
      try { navigator.mediaSession.setActionHandler(name, actions[name]); } catch (err) { /* not supported */ }
    });
  }

  function updatePosition() {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(audio.currentTime, audio.duration)
      });
    } catch (err) { /* iOS may not support position state */ }
  }

  /* A locked or face-down phone hides the page. Do not pause here. */
  audio.addEventListener("play", function () {
    dock.dataset.state = "playing";
    dockState.textContent = "Playing";
    dockToggle.textContent = "Pause";
    setMediaSession();
    updatePosition();
  });

  audio.addEventListener("pause", function () {
    if (dock.hidden) return;
    dock.dataset.state = audio.ended ? "ended" : "paused";
    dockState.textContent = audio.ended ? "Finished" : "Paused";
    dockToggle.textContent = "Play";
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  });

  audio.addEventListener("timeupdate", updatePosition);
  audio.addEventListener("ended", function () {
    dock.dataset.state = "ended";
    dockState.textContent = "Finished";
    dockToggle.textContent = "Play";
  });

  dockToggle.addEventListener("click", async function () {
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch (err) {
      dockState.textContent = "Could not play";
    }
  });

  function entry(id) {
    return catalogById.get(id) || null;
  }

  function appendPsalm(parent, item) {
    parent.append(el("h3", {}, item.ref));
    parent.append(para(item.antiphon, "antiphon"));
    item.verses.forEach(function (row) { parent.append(verse(row[0], row[1])); });
    parent.append(para(window.PRAYERS.glory));
    parent.append(para(item.antiphon, "antiphon"));
  }

  async function renderNight(night, token) {
    const view = el("article", { class: "prayer", "data-day": night.id });
    const days = el("div", { class: "days" });
    window.PRAYERS.nights.forEach(function (item) {
      const button = el("button", {
        type: "button",
        class: "day",
        "aria-pressed": item.id === night.id ? "true" : "false"
      }, item.name.slice(0, 3));
      button.addEventListener("click", function () {
        location.hash = "#/night/" + item.id;
      });
      days.append(button);
    });
    view.append(days);
    view.append(el("h2", {}, "Night Prayer · " + night.name));
    view.append(para("Traditional Roman Compline. The psalm is Douay-Rheims. This is not the copyrighted modern Liturgy of the Hours.", "lede"));
    const primary = await slot(entry(night.audioId), true);
    if (token !== renderToken) return;
    view.append(primary);

    view.append(el("h3", {}, "Opening"));
    view.append(versicle("v", "Turn us, O God our saviour."));
    view.append(versicle("r", "And turn away thine anger from us."));
    view.append(versicle("v", "O God, come to my assistance."));
    view.append(versicle("r", "O Lord, make haste to help me."));
    view.append(para(window.PRAYERS.glory));
    view.append(para("Alleluia. Leave this out in Lent.", "rubric"));

    view.append(el("h3", {}, "Examination"));
    view.append(para("A brief examination of conscience. Thank God for the good in this day, and ask pardon for what was against love.", "rubric"));

    view.append(el("h3", {}, "I confess"));
    view.append(para("I confess to almighty God, to blessed Mary ever Virgin, to blessed Michael the Archangel, to blessed John the Baptist, to the holy apostles Peter and Paul, to all the saints, and to you, brethren, that I have sinned exceedingly in thought, word, and deed, through my fault, through my fault, through my most grievous fault. Therefore I beseech blessed Mary ever Virgin, blessed Michael the Archangel, blessed John the Baptist, the holy apostles Peter and Paul, all the saints, and you, brethren, to pray for me to the Lord our God."));
    view.append(para("May almighty God have mercy on us, forgive us our sins, and bring us to everlasting life. Amen."));

    view.append(el("h3", {}, "Hymn"));
    view.append(para("Te lucis ante terminum", "lede"));
    view.append(para(window.PRAYERS.hymn.join("\n"), "hymn"));

    night.psalms.forEach(function (item) { appendPsalm(view, item); });

    view.append(el("h3", {}, "Reading"));
    view.append(para(window.PRAYERS.reading.ref, "lede"));
    view.append(para(window.PRAYERS.reading.text));
    view.append(versicle("r", "Thanks be to God."));

    view.append(el("h3", {}, "Responsory"));
    view.append(versicle("v", "Into thy hands, O Lord, I commend my spirit."));
    view.append(versicle("r", "Into thy hands, O Lord, I commend my spirit."));
    view.append(versicle("v", "Thou hast redeemed us, O Lord, the God of truth."));
    view.append(versicle("r", "I commend my spirit."));
    view.append(versicle("v", "Glory be to the Father, and to the Son, and to the Holy Ghost."));
    view.append(versicle("r", "Into thy hands, O Lord, I commend my spirit."));

    view.append(el("h3", {}, "Canticle of Simeon"));
    view.append(para(window.PRAYERS.nuncAntiphon, "antiphon"));
    window.PRAYERS.nunc.forEach(function (row) { view.append(verse(row[0], row[1])); });
    view.append(para(window.PRAYERS.glory));
    view.append(para(window.PRAYERS.nuncAntiphon, "antiphon"));

    view.append(el("h3", {}, "Prayer"));
    view.append(para("Visit, we beseech thee, O Lord, this habitation, and drive far from it all snares of the enemy. Let thy holy angels dwell herein, to keep us in peace, and let thy blessing be always upon us. Through our Lord Jesus Christ, thy Son, who liveth and reigneth with thee in the unity of the Holy Ghost, God, world without end. Amen."));

    view.append(el("h3", {}, "Blessing"));
    view.append(versicle("v", "The Lord almighty grant us a quiet night and a perfect end."));
    view.append(versicle("r", "Amen."));
    view.append(versicle("v", "May the almighty and merciful Lord, the Father, the Son, and the Holy Ghost, bless us and keep us."));
    view.append(versicle("r", "Amen."));

    view.append(el("h3", {}, "Hail, holy Queen"));
    view.append(para("Outside Eastertide.", "rubric"));
    view.append(para(window.PRAYERS.hailHolyQueen));
    view.append(versicle("v", "Pray for us, O holy Mother of God."));
    view.append(versicle("r", "That we may be made worthy of the promises of Christ."));
    view.append(para("Let us pray. Almighty, everlasting God, who by the cooperation of the Holy Ghost didst prepare the body and soul of the glorious Virgin Mary to become a dwelling meet for thy Son: grant that we who rejoice in her memory may, by her loving intercession, be delivered from present evils and from lasting death. Through the same Christ our Lord. Amen."));

    const easter = el("details", {});
    easter.append(el("summary", {}, "Eastertide: Regina Caeli, instead of the Hail Holy Queen"));
    easter.append(para("Queen of heaven, rejoice, alleluia. For he whom thou didst merit to bear, alleluia. Hath risen, as he said, alleluia. Pray for us to God, alleluia."));
    easter.append(versicle("v", "Rejoice and be glad, O Virgin Mary, alleluia."));
    easter.append(versicle("r", "For the Lord is risen indeed, alleluia."));
    easter.append(para("Let us pray. O God, who didst vouchsafe to gladden the world by the resurrection of thy Son, our Lord Jesus Christ: grant, we beseech thee, that through his Mother, the Virgin Mary, we may obtain the joys of everlasting life. Through the same Christ our Lord. Amen."));
    view.append(easter);

    content.replaceChildren(view);
    const selectedDay = view.querySelector('.day[aria-pressed="true"]');
    if (selectedDay && selectedDay.scrollIntoView) {
      selectedDay.scrollIntoView({ inline: "center", block: "nearest" });
    }
    if (primary.dataset.audioState === "ready") {
      try {
        await showDock(entry(night.audioId));
      } catch (err) {
        primary.textContent = "This recording did not load.";
        primary.dataset.audioState = "error";
        silenceDock();
      }
    } else {
      silenceDock();
    }
  }

  async function renderBlocks(title, lede, blocks, token) {
    const view = el("article", { class: "prayer" });
    let docked = false;
    view.append(el("h2", {}, title));
    if (lede) view.append(para(lede, "lede"));
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (token !== renderToken) return null;
      if (block.h) view.append(el("h3", {}, block.h));
      else if (block.p) view.append(para(block.p, block.className || null));
      else if (block.v) view.append(versicle("v", block.v));
      else if (block.r) view.append(versicle("r", block.r));
      else if (block.audio) {
        const node = await slot(entry(block.audio), Boolean(block.primary));
        if (token !== renderToken) return null;
        view.append(node);
        if (block.primary && node.dataset.audioState === "ready") {
          try {
            await showDock(entry(block.audio));
            docked = true;
          } catch (err) {
            node.textContent = "This recording did not load.";
            node.dataset.audioState = "error";
          }
        }
      } else if (block.steps) {
        const list = el("ol", { class: "steps" });
        block.steps.forEach(function (step) { list.append(el("li", {}, step)); });
        view.append(list);
      }
    }
    if (token !== renderToken) return null;
    content.replaceChildren(view);
    if (!docked) silenceDock();
    return view;
  }

  function home() {
    silenceDock();
    const tonight = nightById(todayId());
    const view = el("div", {});
    view.append(el("div", { class: "cards" },
      el("a", { class: "card", href: "#/night" },
        el("strong", {}, "Night Prayer"),
        el("span", {}, "Compline for tonight (" + tonight.name + "), and for each day of the week.")),
      el("a", { class: "card", href: "#/morning" },
        el("strong", {}, "Morning Offering"),
        el("span", {}, "Offer the day, with the Our Father, Hail Mary, and Glory Be.")),
      el("a", { class: "card", href: "#/rosary" },
        el("strong", {}, "Rosary"),
        el("span", {}, "The prayers, the mysteries for each day, and the Hail Holy Queen.")),
      el("a", { class: "card", href: "#/common" },
        el("strong", {}, "Common Prayers"),
        el("span", {}, "The Creed, an act of contrition, the Angelus, and other daily prayers."))
    ));
    view.append(para("On iPhone, open Share and choose Add to Home Screen. The first visit stores the prayers on this phone.", "lede"));
    content.replaceChildren(view);
    document.title = "Monro Family Prayers";
  }

  const P = function () { return window.PRAYERS; };

  async function render() {
    const token = ++renderToken;
    const current = route();
    renderNav(current.name === "night" ? "night" : current.name);
    if (!catalog) {
      content.replaceChildren(para("The prayer list is loading.", "lede"));
      return;
    }
    if (current.name === "home") {
      home();
      return;
    }
    if (current.name === "night") {
      const night = nightById(current.day);
      document.title = night.name + " Night Prayer · Monro Family Prayers";
      await renderNight(night, token);
      return;
    }
    if (current.name === "morning") {
      document.title = "Morning Offering · Monro Family Prayers";
      await renderBlocks("Morning Offering", "Begin with the sign of the cross: In the name of the Father, and of the Son, and of the Holy Ghost. Amen.", [
        { audio: "morning-offering", primary: true },
        { h: "Morning Offering" },
        { p: "O Jesus, through the Immaculate Heart of Mary, I offer thee my prayers, works, joys, and sufferings of this day for all the intentions of thy Sacred Heart, in union with the Holy Sacrifice of the Mass throughout the world, in reparation for my sins, for the intentions of all my relatives and friends, and in particular for the intentions of the Holy Father. Amen." },
        { h: "Our Father" },
        { audio: "our-father" },
        { p: P().ourFather },
        { h: "Hail Mary" },
        { audio: "hail-mary" },
        { p: P().hailMary },
        { h: "Glory Be" },
        { audio: "glory-be" },
        { p: P().glory }
      ], token);
      return;
    }
    if (current.name === "rosary") {
      document.title = "Rosary · Monro Family Prayers";
      const sets = ["the Glorious Mysteries", "the Joyful Mysteries", "the Sorrowful Mysteries", "the Glorious Mysteries", "the Luminous Mysteries", "the Sorrowful Mysteries", "the Joyful Mysteries"];
      await renderBlocks("The Rosary", "Today: " + sets[new Date().getDay()] + ".", [
        { audio: "rosary", primary: true },
        { h: "How to pray" },
        { steps: [
          "Make the sign of the cross and say the Apostles' Creed.",
          "Say the Our Father.",
          "Say three Hail Marys.",
          "Say the Glory Be.",
          "Announce the first mystery, then say the Our Father.",
          "Say ten Hail Marys while meditating on that mystery.",
          "Say the Glory Be. The Fatima prayer below is optional.",
          "Repeat for each of the five mysteries.",
          "Say the Hail Holy Queen and the closing prayer."
        ] },
        { h: "Optional prayer after each Glory Be" },
        { p: "O my Jesus, forgive us our sins, save us from the fires of hell, and lead all souls to heaven, especially those in most need of thy mercy." },
        { h: "Joyful Mysteries" },
        { p: "Monday and Saturday.", className: "rubric" },
        { p: "1. The Annunciation. Mary hears the angel and consents.", className: "mystery" },
        { p: "2. The Visitation. Mary visits Elizabeth.", className: "mystery" },
        { p: "3. The Nativity. Jesus is born at Bethlehem.", className: "mystery" },
        { p: "4. The Presentation. Mary and Joseph present Jesus in the temple.", className: "mystery" },
        { p: "5. The Finding in the Temple. Jesus is found among the teachers.", className: "mystery" },
        { h: "Sorrowful Mysteries" },
        { p: "Tuesday and Friday.", className: "rubric" },
        { p: "1. The Agony in the Garden. Jesus prays while the disciples sleep.", className: "mystery" },
        { p: "2. The Scourging at the Pillar. Jesus is scourged.", className: "mystery" },
        { p: "3. The Crowning with Thorns. The soldiers crown him and mock him.", className: "mystery" },
        { p: "4. The Carrying of the Cross. Jesus carries the cross.", className: "mystery" },
        { p: "5. The Crucifixion. Jesus dies on the cross.", className: "mystery" },
        { h: "Glorious Mysteries" },
        { p: "Wednesday and Sunday.", className: "rubric" },
        { p: "1. The Resurrection. Jesus rises from the dead.", className: "mystery" },
        { p: "2. The Ascension. Jesus ascends into heaven.", className: "mystery" },
        { p: "3. The Descent of the Holy Ghost. The Spirit comes upon the apostles.", className: "mystery" },
        { p: "4. The Assumption. Mary is taken up into heaven.", className: "mystery" },
        { p: "5. The Coronation. Mary is crowned queen of heaven.", className: "mystery" },
        { h: "Luminous Mysteries" },
        { p: "Thursday. These five Gospel scenes were proposed in 2002. The names are the events themselves.", className: "rubric" },
        { p: "1. The Baptism in the Jordan. The Father names Jesus his beloved Son.", className: "mystery" },
        { p: "2. The Wedding at Cana. Jesus turns water into wine.", className: "mystery" },
        { p: "3. The Proclamation of the Kingdom. Jesus calls hearers to repent and believe.", className: "mystery" },
        { p: "4. The Transfiguration. Jesus is seen in glory.", className: "mystery" },
        { p: "5. The Institution of the Eucharist. Jesus gives his body and blood at the Last Supper.", className: "mystery" }
      ], token);
      if (token !== renderToken) return;
      const article = content.querySelector("article");
      if (!article) return;
      const prayers = [
        ["Apostles' Creed", "apostles-creed", P().creed],
        ["Our Father", "our-father", P().ourFather],
        ["Hail Mary", "hail-mary", P().hailMary],
        ["Glory Be", "glory-be", P().glory],
        ["Hail, holy Queen", "hail-holy-queen", P().hailHolyQueen]
      ];
      for (let i = 0; i < prayers.length; i += 1) {
        article.append(el("h3", {}, prayers[i][0]));
        article.append(await slot(entry(prayers[i][1]), false));
        article.append(para(prayers[i][2]));
      }
      article.append(el("h3", {}, "Closing prayer"));
      article.append(para("O God, whose only-begotten Son, by his life, death, and resurrection, hath purchased for us the rewards of eternal life: grant, we beseech thee, that meditating upon these mysteries of the most holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise. Through the same Christ our Lord. Amen."));
      return;
    }
    if (current.name === "common") {
      document.title = "Common Prayers · Monro Family Prayers";
      await renderBlocks("Common Prayers", "Prayers for any hour. Each one has its own recording file.", [
        { h: "Apostles' Creed" },
        { audio: "apostles-creed", primary: true },
        { p: P().creed },
        { h: "Our Father" },
        { audio: "our-father" },
        { p: P().ourFather },
        { h: "Hail Mary" },
        { audio: "hail-mary" },
        { p: P().hailMary },
        { h: "Glory Be" },
        { audio: "glory-be" },
        { p: P().glory },
        { h: "Hail, holy Queen" },
        { audio: "hail-holy-queen" },
        { p: P().hailHolyQueen },
        { h: "Act of Contrition" },
        { audio: "act-of-contrition" },
        { p: "O my God! I am heartily sorry for having offended Thee, and I detest all my sins, because I dread the loss of heaven and the pains of hell, but most of all because they offend Thee, my God, Who art all-good and deserving of all my love. I firmly resolve, with the help of Thy grace, to confess my sins, to do penance, and to amend my life. Amen." },
        { h: "Guardian Angel" },
        { audio: "guardian-angel" },
        { p: "Angel of God, my guardian dear, to whom God's love commits me here, ever this day be at my side, to light and guard, to rule and guide. Amen." },
        { h: "Saint Michael" },
        { audio: "saint-michael" },
        { p: "Saint Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray; and do thou, O Prince of the heavenly host, by the power of God, cast into hell Satan and all the evil spirits who wander through the world seeking the ruin of souls. Amen." },
        { h: "The Angelus" },
        { audio: "angelus" },
        { v: "The Angel of the Lord declared unto Mary." },
        { r: "And she conceived of the Holy Ghost." },
        { p: P().hailMary },
        { v: "Behold the handmaid of the Lord." },
        { r: "Be it done unto me according to thy word." },
        { p: P().hailMary },
        { v: "And the Word was made flesh." },
        { r: "And dwelt among us." },
        { p: P().hailMary },
        { v: "Pray for us, O holy Mother of God." },
        { r: "That we may be made worthy of the promises of Christ." },
        { p: "Let us pray. Pour forth, we beseech thee, O Lord, thy grace into our hearts, that we, to whom the incarnation of Christ thy Son was made known by the message of an angel, may by his passion and cross be brought to the glory of his resurrection. Through the same Christ our Lord. Amen." }
      ], token);
    }
  }

  async function loadCatalog() {
    const url = new URL("audio/catalog.json", pageBase()).href;
    try {
      const resp = await fetch(url, { cache: "reload" });
      if (resp.ok) return resp.json();
    } catch (err) { /* fall through to the cached copy */ }
    if ("caches" in window) {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(url);
      if (hit) return hit.json();
    }
    throw new Error("catalog unavailable");
  }

  async function start() {
    window.addEventListener("hashchange", function () { render().catch(showError); });
    try {
      catalog = await loadCatalog();
      catalogById = new Map(catalog.prayers.map(function (item) { return [item.id, item]; }));
    } catch (err) {
      content.replaceChildren(para("The recording list could not be loaded. The prayers below need a refresh while online.", "missing"));
      return;
    }
    await render();
    registerWorker();
  }

  function showError(err) {
    statusEl.textContent = "Something on the page failed to open.";
    console.error(err);
  }

  function registerWorker() {
    if (!("serviceWorker" in navigator)) {
      statusEl.textContent = "This browser will not save the prayers offline.";
      return;
    }
    statusEl.textContent = "Preparing offline copy…";
    const base = pageBase();
    navigator.serviceWorker.register(new URL("sw.js", base), { scope: base.pathname }).then(function () {
      return navigator.serviceWorker.ready;
    }).then(function () {
      const mark = function () {
        if (navigator.serviceWorker.controller) {
          statusEl.textContent = "Saved for offline use on this phone.";
        }
      };
      mark();
      navigator.serviceWorker.addEventListener("controllerchange", mark);
    }).catch(function () {
      statusEl.textContent = "Offline copy could not be saved in this browser.";
    });
  }

  start().catch(showError);
})();
