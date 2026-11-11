/* Public-domain prayer texts. Citations: /sources.html and SOURCES.md. */
(function (global) {
  const GLORY = "Glory be to the Father, and to the Son, and to the Holy Ghost. As it was in the beginning, is now, and ever shall be, world without end. Amen.";

  const OUR_FATHER = "Our Father, who art in heaven, hallowed be thy name. Thy kingdom come. Thy will be done on earth, as it is in heaven. Give us this day our daily bread. And forgive us our trespasses, as we forgive those who trespass against us. And lead us not into temptation, but deliver us from evil. Amen.";

  const HAIL_MARY = "Hail Mary, full of grace, the Lord is with thee. Blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.";

  const CREED = "I believe in God, the Father almighty, Creator of heaven and earth; and in Jesus Christ, his only Son, our Lord; who was conceived by the Holy Ghost, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried. He descended into hell; the third day he rose again from the dead. He ascended into heaven, sitteth at the right hand of God, the Father almighty; from thence he shall come to judge the living and the dead. I believe in the Holy Ghost, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.";

  const HAIL_HOLY_QUEEN = "Hail, holy Queen, Mother of mercy, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary.";

  function psalm(ref, antiphon, verses) {
    return { ref: ref, antiphon: antiphon, verses: verses };
  }

  const nights = [
    {
      id: "sunday",
      name: "Sunday",
      audioId: "compline-sunday",
      psalms: [
        psalm("Psalm 90 (Hebrew 91)", "He that dwelleth in the aid of the most High, shall abide under the protection of the God of Jacob.", [
          [1, "He that dwelleth in the aid of the most High, shall abide under the protection of the God of Jacob."],
          [2, "He shall say to the Lord: Thou art my protector, and my refuge: my God, in him will I trust."],
          [3, "For he hath delivered me from the snare of the hunters: and from the sharp word."],
          [4, "He will overshadow thee with his shoulders: and under his wings thou shalt trust."],
          [5, "His truth shall compass thee with a shield: thou shalt not be afraid of the terror of the night."],
          [6, "Of the arrow that flieth in the day, of the business that walketh about in the dark: of invasion, or of the noonday devil."],
          [7, "A thousand shall fall at thy side, and ten thousand at thy right hand: but it shall not come nigh thee."],
          [8, "But thou shalt consider with thy eyes: and shalt see the reward of the wicked."],
          [9, "Because thou, O Lord, art my hope: thou hast made the most High thy refuge."],
          [10, "There shall no evil come to thee: nor shall the scourge come near thy dwelling."],
          [11, "For he hath given his angels charge over thee; to keep thee in all thy ways."],
          [12, "In their hands they shall bear thee up: lest thou dash thy foot against a stone."],
          [13, "Thou shalt walk upon the asp and the basilisk: and thou shalt trample under foot the lion and the dragon."],
          [14, "Because he hoped in me I will deliver him: I will protect him because he hath known my name."],
          [15, "He shall cry to me, and I will hear him: I am with him in tribulation, I will deliver him, and I will glorify him."],
          [16, "I will fill him with length of days; and I will shew him my salvation."]
        ])
      ]
    },
    {
      id: "monday",
      name: "Monday",
      audioId: "compline-monday",
      psalms: [
        psalm("Psalm 85 (Hebrew 86)", "Incline thy ear, O Lord, and hear me: for I am needy and poor.", [
          [1, "Incline thy ear, O Lord, and hear me: for I am needy and poor."],
          [2, "Preserve my soul, for I am holy: save thy servant, O my God, that trusteth in thee."],
          [3, "Have mercy on me, O Lord, for I have cried to thee all the day."],
          [4, "Give joy to the soul of thy servant, for to thee, O Lord, I have lifted up my soul."],
          [5, "For thou, O Lord, art sweet and mild: and plenteous in mercy to all that call upon thee."],
          [6, "Give ear, O Lord, to my prayer: and attend to the voice of my petition."],
          [7, "I have called upon thee in the day of my trouble: because thou hast heard me."],
          [8, "There is none among the gods like unto thee, O Lord: and there is none according to thy works."],
          [9, "All the nations thou hast made shall come and adore before thee, O Lord: and they shall glorify thy name."],
          [10, "For thou art great and dost wonderful things: thou art God alone."],
          [11, "Conduct me, O Lord, in thy way, and I will walk in thy truth: let my heart rejoice that it may fear thy name."],
          [12, "I will praise thee, O Lord my God: with my whole heart, and I will glorify thy name for ever:"],
          [13, "For thy mercy is great towards me: and thou hast delivered my soul out of the lower hell."],
          [14, "O God, the wicked are risen up against me, and the assembly of the mighty have sought my soul: and they have not set thee before their eyes."],
          [15, "And thou, O Lord, art a God of compassion, and merciful, patient, and of much mercy, and true."],
          [16, "O look upon me, and have mercy on me: give thy command to thy servant, and save the son of thy handmaid."],
          [17, "Shew me a token for good: that they who hate me may see, and be confounded, because thou, O Lord, hast helped me and hast comforted me."]
        ])
      ]
    },
    {
      id: "tuesday",
      name: "Tuesday",
      audioId: "compline-tuesday",
      psalms: [
        psalm("Psalm 142 (Hebrew 143)", "Hear, O Lord, my prayer: give ear to my supplication in thy truth.", [
          [1, "Hear, O Lord, my prayer: give ear to my supplication in thy truth: hear me in thy justice."],
          [2, "And enter not into judgment with thy servant: for in thy sight no man living shall be justified."],
          [3, "For the enemy hath persecuted my soul: he hath brought down my life to the earth. He hath made me to dwell in darkness as those that have been dead of old:"],
          [4, "And my spirit is in anguish within me: my heart within me is troubled."],
          [5, "I remembered the days of old, I meditated on all thy works: I meditated upon the works of thy hands."],
          [6, "I stretched forth my hands to thee: my soul is as earth without water unto thee."],
          [7, "Hear me speedily, O Lord: my spirit hath fainted away. Turn not away thy face from me, lest I be like unto them that go down into the pit."],
          [8, "Cause me to hear thy mercy in the morning; for in thee have I hoped. Make the way known to me, wherein I should walk: for I have lifted up my soul to thee."],
          [9, "Deliver me from my enemies, O Lord, to thee have I fled:"],
          [10, "Teach me to do thy will, for thou art my God. Thy good spirit shall lead me into the right land:"],
          [11, "For thy name's sake, O Lord, thou wilt quicken me in thy justice. Thou wilt bring my soul out of trouble:"],
          [12, "And in thy mercy thou wilt destroy my enemies. And thou wilt cut off all them that afflict my soul: for I am thy servant."]
        ])
      ]
    },
    {
      id: "wednesday",
      name: "Wednesday",
      audioId: "compline-wednesday",
      psalms: [
        psalm("Psalm 30 (Hebrew 31)", "In thee, O Lord, have I hoped, let me never be confounded.", [
          [2, "In thee, O Lord, have I hoped, let me never be confounded: deliver me in thy justice."],
          [3, "Bow down thy ear to me: make haste to deliver me. Be thou unto me a God, a protector, and a house of refuge, to save me."],
          [4, "For thou art my strength and my refuge; and for thy name's sake thou wilt lead me, and nourish me."],
          [5, "Thou wilt bring me out of this snare, which they have hidden for me: for thou art my protector."],
          [6, "Into thy hands I commend my spirit: thou hast redeemed me, O Lord, the God of truth."],
          [7, "Thou hast hated them that regard vanities, to no purpose. But I have hoped in the Lord:"],
          [8, "I will be glad and rejoice in thy mercy. For thou hast regarded my humility, thou hast saved my soul out of distresses."],
          [9, "And thou hast not shut me up in the hands of the enemy: thou hast set my feet in a spacious place."],
          [10, "Have mercy on me, O Lord, for I am afflicted: my eye is troubled with wrath, my soul, and my belly:"],
          [11, "For my life is wasted with grief: and my years in sighs. My strength is weakened through poverty and my bones are disturbed."],
          [12, "I am become a reproach among all my enemies, and very much to my neighbours; and a fear to my acquaintance. They that saw me without fled from me."],
          [13, "I am forgotten as one dead from the heart. I am become as a vessel that is destroyed."],
          [14, "For I have heard the blame of many that dwell round about. While they assembled together against me, they consulted to take away my life."],
          [15, "But I have put my trust in thee, O Lord: I said: Thou art my God."],
          [16, "My lots are in thy hands. Deliver me out of the hands of my enemies; and from them that persecute me."],
          [17, "Make thy face to shine upon thy servant; save me in thy mercy."],
          [18, "Let me not be confounded, O Lord, for I have called upon thee. Let the wicked be ashamed, and be brought down to hell."],
          [19, "Let deceitful lips be made dumb. Which speak iniquity against the just, with pride and abuse."],
          [20, "O how great is the multitude of thy sweetness, O Lord, which thou hast hidden for them that fear thee! Which thou hast wrought for them that hope in thee, in the sight of the sons of men."],
          [21, "Thou shalt hide them in the secret of thy face, from the disturbance of men. Thou shalt protect them in thy tabernacle from the contradiction of tongues."],
          [22, "Blessed be the Lord, for he hath shewn his wonderful mercy to me in a fortified city."],
          [23, "But I said in the excess of my mind: I am cast away from before thy eyes. Therefore thou hast heard the voice of my prayer, when I cried to thee."],
          [24, "O love the Lord, all ye his saints: for the Lord will require truth, and will repay them abundantly that act proudly."],
          [25, "Do ye manfully, and let your heart be strengthened, all ye that hope in the Lord."]
        ]),
        psalm("Psalm 129 (Hebrew 130)", "Out of the depths I have cried to thee, O Lord.", [
          [1, "Out of the depths I have cried to thee, O Lord:"],
          [2, "Lord, hear my voice. Let thy ears be attentive to the voice of my supplication."],
          [3, "If thou, O Lord, wilt mark iniquities: Lord, who shall stand it."],
          [4, "For with thee there is merciful forgiveness: and by reason of thy law, I have waited for thee, O Lord. My soul hath relied on his word:"],
          [5, "My soul hath hoped in the Lord."],
          [6, "From the morning watch even until night, let Israel hope in the Lord."],
          [7, "Because with the Lord there is mercy: and with him plentiful redemption."],
          [8, "And he shall redeem Israel from all his iniquities."]
        ])
      ]
    },
    {
      id: "thursday",
      name: "Thursday",
      audioId: "compline-thursday",
      psalms: [
        psalm("Psalm 15 (Hebrew 16)", "Preserve me, O Lord, for I have put my trust in thee.", [
          [1, "Preserve me, O Lord, for I have put my trust in thee."],
          [2, "I have said to the Lord, thou art my God, for thou hast no need of my goods."],
          [3, "To the saints, who are in his land, he hath made wonderful all my desires in them."],
          [4, "Their infirmities were multiplied: afterwards they made haste. I will not gather together their meetings for blood offerings: nor will I be mindful of their names by my lips."],
          [5, "The Lord is the portion of my inheritance and of my cup: it is thou that wilt restore my inheritance to me."],
          [6, "The lines are fallen unto me in goodly places: for my inheritance is goodly to me."],
          [7, "I will bless the Lord, who hath given me understanding: moreover my reins also have corrected me even till night."],
          [8, "I set the Lord always in my sight: for he is at my right hand, that I be not moved."],
          [9, "Therefore my heart hath been glad, and my tongue hath rejoiced: moreover my flesh also shall rest in hope."],
          [10, "Because thou wilt not leave my soul in hell; nor wilt thou give thy holy one to see corruption."],
          [11, "Thou hast made known to me the ways of life, thou shalt fill me with joy with thy countenance: at thy right hand are delights even to the end."]
        ])
      ]
    },
    {
      id: "friday",
      name: "Friday",
      audioId: "compline-friday",
      psalms: [
        psalm("Psalm 87 (Hebrew 88)", "O Lord, the God of my salvation: I have cried in the day, and in the night before thee.", [
          [2, "O Lord, the God of my salvation: I have cried in the day, and in the night before thee."],
          [3, "Let my prayer come in before thee: incline thy ear to my petition."],
          [4, "For my soul is filled with evils: and my life hath drawn nigh to hell."],
          [5, "I am counted among them that go down to the pit: I am become as a man without help,"],
          [6, "Free among the dead. Like the slain sleeping in the sepulchres, whom thou rememberest no more: and they are cast off from thy hand."],
          [7, "They have laid me in the lower pit: in the dark places, and in the shadow of death."],
          [8, "Thy wrath is strong over me: and all thy waves thou hast brought in upon me."],
          [9, "Thou hast put away my acquaintance far from me: they have set me an abomination to themselves. I was delivered up, and came not forth:"],
          [10, "My eyes languished through poverty. All the day I cried to thee, O Lord: I stretched out my hands to thee."],
          [11, "Wilt thou shew wonders to the dead? or shall physicians raise to life, and give praise to thee?"],
          [12, "Shall any one in the sepulchre declare thy mercy: and thy truth in destruction?"],
          [13, "Shall thy wonders be known in the dark; and thy justice in the land of forgetfulness?"],
          [14, "But I, O Lord, have cried to thee: and in the morning my prayer shall prevent thee."],
          [15, "Lord, why castest thou off my prayer: why turnest thou away thy face from me?"],
          [16, "I am poor, and in labours from my youth: and being exalted have been humbled and troubled."],
          [17, "Thy wrath hath come upon me: and thy terrors have troubled me."],
          [18, "They have come round about me like water all the day: they have compassed me about together."],
          [19, "Friend and neighbour thou hast put far from me: and my acquaintance, because of misery."]
        ])
      ]
    },
    {
      id: "saturday",
      name: "Saturday",
      audioId: "compline-saturday",
      psalms: [
        psalm("Psalm 4", "Have mercy on me: and hear my prayer.", [
          [2, "When I called upon him, the God of my justice heard me: when I was in distress, thou hast enlarged me. Have mercy on me: and hear my prayer."],
          [3, "O ye sons of men, how long will you be dull of heart? why do you love vanity, and seek after lying?"],
          [4, "Know ye also that the Lord hath made his holy one wonderful: the Lord will hear me when I shall cry unto him."],
          [5, "Be angry, and sin not: the things you say in your hearts, be sorry for them upon your beds."],
          [6, "Offer up the sacrifice of justice, and trust in the Lord: many say, Who sheweth us good things?"],
          [7, "The light of thy countenance O Lord, is signed upon us: thou hast given gladness in my heart."],
          [8, "By the fruit of their corn, their wine and oil, they are multiplied."],
          [9, "In peace in the selfsame I will sleep, and I will rest:"],
          [10, "For thou, O Lord, singularly hast settled me in hope."]
        ]),
        psalm("Psalm 133 (Hebrew 134)", "Behold now bless ye the Lord, all ye servants of the Lord.", [
          [1, "Behold now bless ye the Lord, all ye servants of the Lord: Who stand in the house of the Lord, in the courts of the house of our God."],
          [2, "In the nights lift up your hands to the holy places, and bless ye the Lord."],
          [3, "May the Lord out of Sion bless thee, he that made heaven and earth."]
        ])
      ]
    }
  ];

  global.PRAYERS = {
    glory: GLORY,
    ourFather: OUR_FATHER,
    hailMary: HAIL_MARY,
    creed: CREED,
    hailHolyQueen: HAIL_HOLY_QUEEN,
    nights: nights,
    reading: {
      ref: "Jeremias 14:9",
      text: "Why wilt thou be as a wandering man, as a mighty man that cannot save? but thou, O Lord, art among us, and thy name is called upon by us, forsake us not."
    },
    hymn: [
      "Before the ending of the day,",
      "Creator of the world, we pray,",
      "That with thy wonted favour, thou",
      "Wouldst be our guard and keeper now.",
      "",
      "From all ill dreams defend our eyes,",
      "From nightly fears and fantasies;",
      "Tread under foot our ghostly foe,",
      "That no pollution we may know.",
      "",
      "O Father, that we ask be done,",
      "Through Jesus Christ, thine only Son,",
      "Who, with the Holy Ghost and thee,",
      "Doth live and reign eternally. Amen."
    ],
    nuncAntiphon: "Guard us, O Lord, while we are awake, and keep us while we sleep, that we may watch with Christ, and rest in peace.",
    nunc: [
      [29, "Now thou dost dismiss thy servant, O Lord, according to thy word in peace;"],
      [30, "Because my eyes have seen thy salvation,"],
      [31, "Which thou hast prepared before the face of all peoples:"],
      [32, "A light to the revelation of the Gentiles, and the glory of thy people Israel."]
    ]
  };
})(window);
