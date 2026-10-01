/* MandarinPath sentence pack — 30 core sentence PATTERNS + 80 example SENTENCES.
   Simplified characters; pinyin with tone marks. Third-tone sandhi is applied where
   Chinese is actually spoken (wǒ hěn hǎo, bù→bú before a 4th tone, yī→yì before a
   4th tone, liǎng for two); a 'note' on a pattern gives the citation tone to study.
   All vocabulary is within the ~800 most common words (HSK 1-2 range). */
window.MP_SENTENCES = {
  groups: [
    { id: "g_greetings", zh: "问候 / Greetings", en: "Greetings" },
    { id: "g_shopping", zh: "购物 / Shopping", en: "Shopping" },
    { id: "g_food", zh: "吃饭 / Food", en: "Food" },
    { id: "g_directions", zh: "问路 / Directions", en: "Directions" },
    { id: "g_time", zh: "时间 / Time", en: "Time" },
    { id: "g_work_study", zh: "工作与学习 / Work & Study", en: "Work & Study" },
    { id: "g_feelings", zh: "心情 / Feelings", en: "Feelings" },
    { id: "g_weather", zh: "天气 / Weather", en: "Weather" },
    { id: "g_family", zh: "家人 / Family", en: "Family" }
  ],
  patterns: [
    {
      id: "p01", zh: "你好。", pinyin: "nǐ hǎo.", en: "Hello! / Good day.",
      slots: [
        { key: "greeting", zh: "你好", pinyin: "n\u01d0 h\u01ceo", en: "hello" },
        { key: "greeting", zh: "早上好", pinyin: "z\u01ceoshang h\u01ceo", en: "good morning" },
        { key: "greeting", zh: "晚上好", pinyin: "w\u01censhang h\u01ceo", en: "good evening" },
        { key: "greeting", zh: "大家好", pinyin: "d\u00e0ji\u0101 h\u01ceo", en: "hello everyone" },
        { key: "greeting", zh: "再见", pinyin: "z\u00e0iji\u00e0n", en: "goodbye" }
      ]
    },
    {
      id: "p02", zh: "你好吗？", pinyin: "nǐ hǎo ma?", en: "How are you?",
      slots: [
        { key: "adjective", zh: "好", pinyin: "h\u01ceo", en: "fine / good" },
        { key: "adjective", zh: "忙", pinyin: "m\u00e1ng", en: "busy" },
        { key: "adjective", zh: "累", pinyin: "l\u00e8i", en: "tired" }
      ]
    },
    {
      id: "p03", zh: "我叫___。", pinyin: "wǒ jiào ___.", en: "My name is ___.",
      slots: [
        { key: "name", zh: "李明", pinyin: "L\u01d0 M\u00edng", en: "Li Ming (a person\u2019s name)" },
        { key: "name", zh: "玛丽", pinyin: "M\u01cel\u00ec", en: "Mary" },
        { key: "name", zh: "小明", pinyin: "Xi\u01ceom\u00edng", en: "Xiaoming" }
      ]
    },
    {
      id: "p04", zh: "你叫什么___？", pinyin: "nǐ jiào shénme ___?", en: "What is your ___?",
      slots: [
        { key: "question_word", zh: "什么", pinyin: "sh\u00e9nme", en: "what" },
        { key: "question_word", zh: "哪儿", pinyin: "n\u01cer", en: "where" }
      ]
    },
    {
      id: "p05", zh: "___是___。", pinyin: "___ shì ___.", en: "___ is a ___.",
      slots: [
        { key: "subject", zh: "我", pinyin: "w\u01d2", en: "I" },
        { key: "subject", zh: "他", pinyin: "t\u0101", en: "he" },
        { key: "subject", zh: "我们", pinyin: "w\u01d2men", en: "we" },
        { key: "noun", zh: "学生", pinyin: "xu\u00e9sh\u0113ng", en: "student" },
        { key: "noun", zh: "老师", pinyin: "l\u01ceosh\u012b", en: "teacher" },
        { key: "noun", zh: "医生", pinyin: "y\u012bsh\u0113ng", en: "doctor" },
        { key: "noun", zh: "一家人", pinyin: "y\u00ec ji\u0101 r\u00e9n", en: "one family" }
      ]
    },
    {
      id: "p06", zh: "这是___。", pinyin: "zhè shì ___.", en: "This is ___.",
      slots: [
        { key: "thing", zh: "我的书", pinyin: "w\u01d2 de sh\u016b", en: "my book" },
        { key: "thing", zh: "我的家", pinyin: "w\u01d2 de ji\u0101", en: "my home" },
        { key: "thing", zh: "我的妈妈", pinyin: "w\u01d2 de m\u0101ma", en: "my mother" },
        { key: "thing", zh: "你的名字", pinyin: "n\u01d0 de m\u00edngzi", en: "your name" },
        { key: "thing", zh: "那个包", pinyin: "n\u00e0 ge b\u0101o", en: "that bag" }
      ]
    },
    {
      id: "p07", zh: "这是什么？", pinyin: "zhè shì shénme?", en: "What is this?",
      slots: [
        { key: "question_word", zh: "什么", pinyin: "sh\u00e9nme", en: "what" }
      ]
    },
    {
      id: "p08", zh: "___多少钱？", pinyin: "___ duōshao qián?", en: "How much is ___?",
      slots: [
        { key: "item", zh: "这个", pinyin: "zh\u00e8ge", en: "this one" },
        { key: "item", zh: "那个", pinyin: "n\u00e0ge", en: "that one" },
        { key: "item", zh: "一碗面", pinyin: "y\u00ec w\u01cen mi\u00e0n", en: "a bowl of noodles" },
        { key: "item", zh: "一件衣服", pinyin: "y\u00ed ji\u00e0n y\u012bfu", en: "a piece of clothing" },
        { key: "item", zh: "这个菜", pinyin: "zh\u00e8ge c\u00e0i", en: "this dish" }
      ]
    },
    {
      id: "p09", zh: "太___了。", pinyin: "tài ___ le.", en: "It is too ___.",
      slots: [
        { key: "adjective", zh: "贵", pinyin: "gu\u00ec", en: "expensive" },
        { key: "adjective", zh: "热", pinyin: "r\u00e8", en: "hot" },
        { key: "adjective", zh: "累", pinyin: "l\u00e8i", en: "tiring" },
        { key: "adjective", zh: "难", pinyin: "n\u00e1n", en: "difficult" },
        { key: "adjective", zh: "咸", pinyin: "xi\u00e1n", en: "salty" },
        { key: "adjective", zh: "好", pinyin: "h\u01ceo", en: "good (too good to be true)" }
      ]
    },
    {
      id: "p10", zh: "我想___。", pinyin: "wǒ xiǎng ___.", en: "I want to ___ / I would like ___.",
      slots: [
        { key: "verb", zh: "要", pinyin: "y\u00e0o", en: "to want" },
        { key: "verb", zh: "去", pinyin: "q\u00f9", en: "to go" },
        { key: "verb", zh: "吃", pinyin: "ch\u012b", en: "to eat" },
        { key: "verb", zh: "喝", pinyin: "h\u0113", en: "to drink" },
        { key: "verb", zh: "买", pinyin: "m\u01cei", en: "to buy" },
        { key: "verb", zh: "学", pinyin: "xu\u00e9", en: "to study" },
        { key: "verb", zh: "看", pinyin: "k\u00e0n", en: "to watch / read" },
        { key: "verb", zh: "家", pinyin: "ji\u0101", en: "to be homesick (\u60f3\u5bb6)" },
        { key: "verb", zh: "等一会儿", pinyin: "d\u011bng y\u00edhu\u00ecr", en: "to wait a little" }
      ]
    },
    {
      id: "p11", zh: "我要___。", pinyin: "wǒ yào ___.", en: "I want ___ (ordering) / I will ___.",
      slots: [
        { key: "item", zh: "一杯茶", pinyin: "y\u00ec b\u0113i ch\u00e1", en: "a cup of tea" },
        { key: "item", zh: "一碗米饭", pinyin: "y\u00ec w\u01cen m\u01d0f\u00e0n", en: "a bowl of rice" },
        { key: "item", zh: "两个包子", pinyin: "li\u01ceng g\u00e8 b\u0101ozi", en: "two steamed buns" },
        { key: "item", zh: "一杯水", pinyin: "y\u00ec b\u0113i shu\u01d0", en: "a glass of water" },
        { key: "item", zh: "一杯热水", pinyin: "y\u00ec b\u0113i r\u00e8 shu\u01d0", en: "a glass of hot water" },
        { key: "item", zh: "一把伞", pinyin: "y\u00ec b\u01ce s\u01cen", en: "an umbrella" },
        { key: "verb", zh: "去公司", pinyin: "q\u00f9 g\u014dngs\u012b", en: "to go to the office" }
      ]
    },
    {
      id: "p12", zh: "请给我___。", pinyin: "qǐng gěi wǒ ___.", en: "Please give me ___.",
      slots: [
        { key: "item", zh: "一个袋子", pinyin: "y\u00ed g\u00e8 d\u00e0izi", en: "a bag" },
        { key: "item", zh: "一杯水", pinyin: "y\u00ec b\u0113i shu\u01d0", en: "a glass of water" },
        { key: "item", zh: "菜单", pinyin: "c\u00e0id\u0101n", en: "the menu" }
      ]
    },
    {
      id: "p13", zh: "我去___。", pinyin: "wǒ qù ___.", en: "I go to ___.",
      slots: [
        { key: "place", zh: "学校", pinyin: "xu\u00e9xi\u00e0o", en: "school" },
        { key: "place", zh: "公司", pinyin: "g\u014dngs\u012b", en: "the office / company" },
        { key: "place", zh: "医院", pinyin: "y\u012byu\u00e0n", en: "the hospital" },
        { key: "place", zh: "中国", pinyin: "Zh\u014dnggu\u00f3", en: "China" },
        { key: "place", zh: "上班", pinyin: "sh\u00e0ngb\u0101n", en: "to work" }
      ]
    },
    {
      id: "p14", zh: "我喜欢___。", pinyin: "wǒ xǐhuan ___.", en: "I like ___.",
      slots: [
        { key: "verb", zh: "喝茶", pinyin: "h\u0113 ch\u00e1", en: "to drink tea" },
        { key: "verb", zh: "唱歌", pinyin: "ch\u00e0ng g\u0113", en: "to sing" },
        { key: "verb", zh: "看电影", pinyin: "k\u00e0n di\u00e0ny\u01d0ng", en: "to watch movies" },
        { key: "verb", zh: "学中文", pinyin: "xu\u00e9 Zh\u014dngw\u00e9n", en: "to study Chinese" },
        { key: "noun", zh: "这个菜", pinyin: "zh\u00e8ge c\u00e0i", en: "this dish" }
      ]
    },
    {
      id: "p15", zh: "我不喜欢___。", pinyin: "wǒ bù xǐhuan ___.", en: "I don't like ___.",
      slots: [
        { key: "adjective", zh: "辣", pinyin: "l\u00e0", en: "spicy" },
        { key: "verb", zh: "看电影", pinyin: "k\u00e0n di\u00e0ny\u01d0ng", en: "to watch movies" },
        { key: "noun", zh: "咖啡", pinyin: "k\u0101f\u0113i", en: "coffee" },
        { key: "verb", zh: "早起", pinyin: "z\u01ceoq\u01d0", en: "to get up early" },
        { key: "verb", zh: "下雨", pinyin: "xi\u00e0y\u01d4", en: "rain (to rain)" }
      ]
    },
    {
      id: "p16", zh: "现在___。", pinyin: "xiànzài ___.", en: "Now it is ___.",
      slots: [
        { key: "time", zh: "几点？", pinyin: "j\u01d0 di\u01cen?", en: "what time is it?" },
        { key: "time", zh: "八点半", pinyin: "b\u0101 di\u01cen b\u00e0n", en: "half past eight" },
        { key: "time", zh: "星期一", pinyin: "x\u012bngq\u012b y\u012b", en: "Monday" },
        { key: "time", zh: "星期几？", pinyin: "x\u012bngq\u012b j\u01d0?", en: "what day of the week is it?" },
        { key: "time", zh: "几号？", pinyin: "j\u01d0 h\u00e0o?", en: "what is the date?" }
      ]
    },
    {
      id: "p17", zh: "___在哪儿？", pinyin: "___ zài nǎr?", en: "Where is ___?",
      slots: [
        { key: "subject", zh: "你", pinyin: "n\u01d0", en: "you" },
        { key: "subject", zh: "车站", pinyin: "ch\u0113zh\u00e0n", en: "the bus / train station" },
        { key: "subject", zh: "学校", pinyin: "xu\u00e9xi\u00e0o", en: "school" },
        { key: "subject", zh: "厕所", pinyin: "c\u00e8su\u01d2", en: "the toilet" },
        { key: "subject", zh: "医院", pinyin: "y\u012byu\u00e0n", en: "the hospital" },
        { key: "subject", zh: "餐厅", pinyin: "c\u0101nt\u012bng", en: "the restaurant" }
      ]
    },
    {
      id: "p18", zh: "怎么去___？", pinyin: "zěnme qù ___?", en: "How do I get to ___?",
      slots: [
        { key: "place", zh: "车站", pinyin: "ch\u0113zh\u00e0n", en: "the station" },
        { key: "place", zh: "公园", pinyin: "g\u014dngyu\u00e1n", en: "the park" },
        { key: "place", zh: "公司", pinyin: "g\u014dngs\u012b", en: "the office" },
        { key: "place", zh: "学校", pinyin: "xu\u00e9xi\u00e0o", en: "school" }
      ]
    },
    {
      id: "p19", zh: "___在吗？", pinyin: "___ zài ma?", en: "Is ___ there?",
      slots: [
        { key: "subject", zh: "你", pinyin: "n\u01d0", en: "you" },
        { key: "subject", zh: "他", pinyin: "t\u0101", en: "he" },
        { key: "subject", zh: "老师", pinyin: "l\u01ceosh\u012b", en: "the teacher" }
      ]
    },
    {
      id: "p20", zh: "你会说___吗？", pinyin: "nǐ huì shuō ___ ma?", en: "Can you speak ___?",
      slots: [
        { key: "language", zh: "中文", pinyin: "Zh\u014dngw\u00e9n", en: "Chinese" },
        { key: "language", zh: "英语", pinyin: "Y\u012bngy\u01d4", en: "English" },
        { key: "language", zh: "法语", pinyin: "F\u01cey\u01d4", en: "French" }
      ]
    },
    {
      id: "p21", zh: "___会说___。", pinyin: "___ huì shuō ___.", en: "___ can speak ___.",
      slots: [
        { key: "subject", zh: "我", pinyin: "w\u01d2", en: "I" },
        { key: "subject", zh: "他", pinyin: "t\u0101", en: "he" },
        { key: "ability", zh: "不会", pinyin: "b\u00fa hu\u00ec", en: "cannot" },
        { key: "ability", zh: "会一点", pinyin: "hu\u00ec y\u00ecdi\u01cen", en: "can, a little" },
        { key: "language", zh: "中文", pinyin: "Zh\u014dngw\u00e9n", en: "Chinese" }
      ]
    },
    {
      id: "p22", zh: "___有___。", pinyin: "___ yǒu ___.", en: "___ has / does not have ___.",
      slots: [
        { key: "subject", zh: "我", pinyin: "w\u01d2", en: "I" },
        { key: "subject", zh: "你", pinyin: "n\u01d0", en: "you" },
        { key: "subject", zh: "他", pinyin: "t\u0101", en: "he" },
        { key: "thing", zh: "时间", pinyin: "sh\u00edji\u0101n", en: "time" },
        { key: "thing", zh: "钱", pinyin: "qi\u00e1n", en: "money" },
        { key: "thing", zh: "哥哥", pinyin: "g\u0113ge", en: "older brother" },
        { key: "thing", zh: "孩子", pinyin: "h\u00e1izi", en: "child" },
        { key: "thing", zh: "问题", pinyin: "w\u00e8nt\u00ed", en: "a question / problem" }
      ]
    },
    {
      id: "p23", zh: "我每天___。", pinyin: "wǒ měitiān ___.", en: "Every day I ___.",
      slots: [
        { key: "verb", zh: "学中文", pinyin: "xu\u00e9 Zh\u014dngw\u00e9n", en: "study Chinese" },
        { key: "verb", zh: "上班", pinyin: "sh\u00e0ngb\u0101n", en: "go to work" },
        { key: "verb", zh: "七点起床", pinyin: "q\u012b di\u01cen q\u01d0chu\u00e1ng", en: "get up at seven" },
        { key: "verb", zh: "读书", pinyin: "d\u00fa sh\u016b", en: "read books" }
      ]
    },
    {
      id: "p24", zh: "我在___工作。", pinyin: "wǒ zài ___ gōngzuò.", en: "I work at ___.",
      slots: [
        { key: "place", zh: "公司", pinyin: "g\u014dngs\u012b", en: "the company" },
        { key: "place", zh: "学校", pinyin: "xu\u00e9xi\u00e0o", en: "school" },
        { key: "place", zh: "医院", pinyin: "y\u012byu\u00e0n", en: "the hospital" },
        { key: "place", zh: "家", pinyin: "ji\u0101", en: "home" },
        { key: "activity", zh: "学习中文", pinyin: "xu\u00e9x\u00ed Zh\u014dngw\u00e9n", en: "study Chinese" }
      ]
    },
    {
      id: "p25", zh: "我觉得___。", pinyin: "wǒ juéde ___.", en: "I feel ___ / I think ___.",
      slots: [
        { key: "state", zh: "很高兴", pinyin: "h\u011bn g\u0101ox\u00ecng", en: "very happy" },
        { key: "state", zh: "很累", pinyin: "h\u011bn l\u00e8i", en: "very tired" },
        { key: "state", zh: "很好", pinyin: "h\u011bn h\u01ceo", en: "very good" },
        { key: "state", zh: "很热", pinyin: "h\u011bn r\u00e8", en: "very hot" },
        { key: "state", zh: "我妈妈很好", pinyin: "w\u01d2 m\u0101ma h\u011bn h\u01ceo", en: "my mother is very good" },
        { key: "state", zh: "这个工作很有意思", pinyin: "zh\u00e8ge g\u014dngzu\u00f2 h\u011bn y\u01d2u y\u00ecsi", en: "this job is very interesting" }
      ]
    },
    {
      id: "p26", zh: "谢谢___。", pinyin: "xièxie ___.", en: "Thank you, ___.",
      slots: [
        { key: "person", zh: "你", pinyin: "n\u01d0", en: "you" },
        { key: "person", zh: "你的帮助", pinyin: "n\u01d0 de b\u0101ngzh\u00f9", en: "your help" },
        { key: "person", zh: "大家", pinyin: "d\u00e0ji\u0101", en: "everyone" }
      ]
    },
    {
      id: "p27", zh: "对不起。", pinyin: "duìbuqǐ.", en: "Sorry / Excuse me.",
      slots: [
        { key: "apology", zh: "对不起", pinyin: "du\u00ecbuq\u01d0", en: "sorry" },
        { key: "apology", zh: "不好意思", pinyin: "b\u00f9 h\u01ceoy\u00ecsi", en: "excuse me / sorry (polite)" }
      ]
    },
    {
      id: "p28", zh: "___天气怎么样？", pinyin: "___ tiānqì zěnmeyàng?", en: "How is the weather ___?",
      slots: [
        { key: "time", zh: "今天", pinyin: "j\u012bnti\u0101n", en: "today" },
        { key: "time", zh: "明天", pinyin: "m\u00edngti\u0101n", en: "tomorrow" },
        { key: "time", zh: "昨天", pinyin: "zu\u00f3ti\u0101n", en: "yesterday" }
      ]
    },
    {
      id: "p29", zh: "___了。", pinyin: "___ le.", en: "___ (a change has happened).",
      slots: [
        { key: "change", zh: "下雨", pinyin: "xi\u00e0y\u01d4", en: "it is raining" },
        { key: "change", zh: "天冷", pinyin: "ti\u0101n l\u011bng", en: "the weather is cold" },
        { key: "change", zh: "天热", pinyin: "ti\u0101n r\u00e8", en: "the weather is hot" },
        { key: "change", zh: "我饿", pinyin: "w\u01d2 \u00e8", en: "I am hungry" },
        { key: "change", zh: "我渴", pinyin: "w\u01d2 k\u011b", en: "I am thirsty" },
        { key: "change", zh: "我来晚", pinyin: "w\u01d2 l\u00e1i w\u01cen", en: "I am late" }
      ]
    },
    {
      id: "p30", zh: "我住在___。", pinyin: "wǒ zhù zài ___.", en: "I live in ___.",
      slots: [
        { key: "place", zh: "北京", pinyin: "B\u011bij\u012bng", en: "Beijing" },
        { key: "place", zh: "上海", pinyin: "Sh\u00e0ngh\u01cei", en: "Shanghai" },
        { key: "place", zh: "学校", pinyin: "xu\u00e9xi\u00e0o", en: "school" },
        { key: "place", zh: "家", pinyin: "ji\u0101", en: "home" }
      ]
    }
  ],
  sentences: [
    { id: "s_g01", group: "g_greetings", pattern: "p01", zh: "你好！", pinyin: "n\u01d0 h\u01ceo!", en: "Hello!" },
    { id: "s_g02", group: "g_greetings", pattern: "p01", zh: "早上好。", pinyin: "z\u01ceoshang h\u01ceo.", en: "Good morning." },
    { id: "s_g03", group: "g_greetings", pattern: "p01", zh: "晚上好。", pinyin: "w\u01censhang h\u01ceo.", en: "Good evening." },
    { id: "s_g04", group: "g_greetings", pattern: "p01", zh: "再见。", pinyin: "z\u00e0iji\u00e0n.", en: "Goodbye." },
    { id: "s_g05", group: "g_greetings", pattern: "p02", zh: "你好吗？", pinyin: "n\u01d0 h\u01ceo ma?", en: "How are you?" },
    { id: "s_g06", group: "g_greetings", pattern: "p02", zh: "我很好，谢谢。", pinyin: "w\u01d2 h\u011bn h\u01ceo, xi\u00e8xie.", en: "I am very well, thank you." },
    { id: "s_g08", group: "g_greetings", pattern: "p03", zh: "我叫李明。", pinyin: "w\u01d2 ji\u00e0o L\u01d0 M\u00edng.", en: "My name is Li Ming." },
    { id: "s_g09", group: "g_greetings", pattern: "p04", zh: "你叫什么名字？", pinyin: "n\u01d0 ji\u00e0o sh\u00e9nme m\u00edngzi?", en: "What is your name?" },
    { id: "s_g11", group: "g_greetings", pattern: "p06", zh: "这是我姐姐。", pinyin: "zh\u00e8 sh\u00ec w\u01d2 ji\u011bjie.", en: "This is my older sister." },
    { id: "s_g12", group: "g_greetings", pattern: "p25", zh: "很高兴认识你。", pinyin: "h\u011bn g\u0101ox\u00ecng r\u00e8nshi n\u01d0.", en: "It is nice to meet you." },
    { id: "s_g13", group: "g_greetings", pattern: "p26", zh: "谢谢你的帮助。", pinyin: "xi\u00e8xie n\u01d0 de b\u0101ngzh\u00f9.", en: "Thank you for your help." },
    { id: "s_g14", group: "g_greetings", pattern: "p19", zh: "你在吗？", pinyin: "n\u01d0 z\u00e0i ma?", en: "Are you there?" },
    { id: "s_sh01", group: "g_shopping", pattern: "p08", zh: "这个多少钱？", pinyin: "zh\u00e8ge du\u014dshao qi\u00e1n?", en: "How much is this?" },
    { id: "s_sh02", group: "g_shopping", pattern: "p08", zh: "那个多少钱？", pinyin: "n\u00e0ge du\u014dshao qi\u00e1n?", en: "How much is that one?" },
    { id: "s_sh03", group: "g_shopping", pattern: "p08", zh: "一件衣服多少钱？", pinyin: "y\u00ed ji\u00e0n y\u012bfu du\u014dshao qi\u00e1n?", en: "How much is this piece of clothing?" },
    { id: "s_sh04", group: "g_shopping", pattern: "p09", zh: "这个太贵了。", pinyin: "zh\u00e8 g\u00e8 t\u00e0i gu\u00ec le.", en: "This is too expensive." },
    { id: "s_sh05", group: "g_shopping", pattern: "p11", zh: "我要一杯茶。", pinyin: "w\u01d2 y\u00e0o y\u00ec b\u0113i ch\u00e1.", en: "I would like a cup of tea." },
    { id: "s_sh06", group: "g_shopping", pattern: "p11", zh: "我要两个包子。", pinyin: "w\u01d2 y\u00e0o li\u01ceng g\u00e8 b\u0101ozi.", en: "I would like two steamed buns." },
    { id: "s_sh07", group: "g_shopping", pattern: "p10", zh: "我想买这个。", pinyin: "w\u01d2 xi\u01ceng m\u01cei zh\u00e8ge.", en: "I want to buy this." },
    { id: "s_sh08", group: "g_shopping", pattern: "p12", zh: "请给我一个袋子。", pinyin: "q\u01d0ng g\u011bi w\u01d2 y\u00ed g\u00e8 d\u00e0izi.", en: "Please give me a bag." },
    { id: "s_sh09", group: "g_shopping", pattern: "p22", zh: "我没有钱。", pinyin: "w\u01d2 m\u00e9iy\u01d2u qi\u00e1n.", en: "I don't have any money." },
    { id: "s_sh10", group: "g_shopping", pattern: "p22", zh: "你有袋子吗？", pinyin: "n\u01d0 y\u01d2u d\u00e0izi ma?", en: "Do you have a bag?" },
    { id: "s_f01", group: "g_food", pattern: "p29", zh: "我饿了。", pinyin: "w\u01d2 \u00e8 le.", en: "I am hungry." },
    { id: "s_f02", group: "g_food", pattern: "p29", zh: "我渴了。", pinyin: "w\u01d2 k\u011b le.", en: "I am thirsty." },
    { id: "s_f03", group: "g_food", pattern: "p10", zh: "我想喝水。", pinyin: "w\u01d2 xi\u01ceng h\u0113 shu\u01d0.", en: "I would like to drink water." },
    { id: "s_f04", group: "g_food", pattern: "p11", zh: "我要一碗米饭。", pinyin: "w\u01d2 y\u00e0o y\u00ec w\u01cen m\u01d0f\u00e0n.", en: "I would like a bowl of rice." },
    { id: "s_f05", group: "g_food", pattern: "p08", zh: "这个菜多少钱？", pinyin: "zh\u00e8ge c\u00e0i du\u014dshao qi\u00e1n?", en: "How much is this dish?" },
    { id: "s_f06", group: "g_food", pattern: "p15", zh: "我不喜欢吃辣。", pinyin: "w\u01d2 b\u00f9 x\u01d0huan ch\u012b l\u00e0.", en: "I don't like eating spicy food." },
    { id: "s_f07", group: "g_food", pattern: "p14", zh: "我很喜欢这个菜。", pinyin: "w\u01d2 h\u011bn x\u01d0huan zh\u00e8ge c\u00e0i.", en: "I like this dish a lot." },
    { id: "s_f08", group: "g_food", pattern: "p09", zh: "这个菜太咸了。", pinyin: "zh\u00e8ge c\u00e0i t\u00e0i xi\u00e1n le.", en: "This dish is too salty." },
    { id: "s_f09", group: "g_food", pattern: "p17", zh: "餐厅在哪儿？", pinyin: "c\u0101nt\u012bng z\u00e0i n\u01cer?", en: "Where is the restaurant?" },
    { id: "s_d01", group: "g_directions", pattern: "p17", zh: "车站在哪儿？", pinyin: "ch\u0113zh\u00e0n z\u00e0i n\u01cer?", en: "Where is the station?" },
    { id: "s_d02", group: "g_directions", pattern: "p17", zh: "学校在哪儿？", pinyin: "xu\u00e9xi\u00e0o z\u00e0i n\u01cer?", en: "Where is the school?" },
    { id: "s_d03", group: "g_directions", pattern: "p17", zh: "你在哪儿？", pinyin: "n\u01d0 z\u00e0i n\u01cer?", en: "Where are you?" },
    { id: "s_d04", group: "g_directions", pattern: "p18", zh: "怎么去公园？", pinyin: "z\u011bnme q\u00f9 g\u014dngyu\u00e1n?", en: "How do I get to the park?" },
    { id: "s_d05", group: "g_directions", pattern: "p13", zh: "我去公司。", pinyin: "w\u01d2 q\u00f9 g\u014dngs\u012b.", en: "I am going to the office." },
    { id: "s_d06", group: "g_directions", pattern: "p11", zh: "我要去医院。", pinyin: "w\u01d2 y\u00e0o q\u00f9 y\u012byu\u00e0n.", en: "I want to go to the hospital." },
    { id: "s_d07", group: "g_directions", pattern: "p27", zh: "对不起，我迷路了。", pinyin: "du\u00ecbuq\u01d0, w\u01d2 m\u00ed l\u00f9 le.", en: "Excuse me, I am lost." },
    { id: "s_d09", group: "g_directions", pattern: "p17", zh: "厕所在哪儿？", pinyin: "c\u00e8su\u01d2 z\u00e0i n\u01cer?", en: "Where is the toilet?" },
    { id: "s_t01", group: "g_time", pattern: "p16", zh: "现在几点？", pinyin: "xi\u00e0nz\u00e0i j\u01d0 di\u01cen?", en: "What time is it now?" },
    { id: "s_t02", group: "g_time", pattern: "p16", zh: "现在八点半。", pinyin: "xi\u00e0nz\u00e0i b\u0101 di\u01cen b\u00e0n.", en: "It is half past eight now." },
    { id: "s_t03", group: "g_time", pattern: "p16", zh: "今天星期一。", pinyin: "j\u012bnti\u0101n x\u012bngq\u012b y\u012b.", en: "Today is Monday." },
    { id: "s_t04", group: "g_time", pattern: "p16", zh: "今天星期几？", pinyin: "j\u012bnti\u0101n x\u012bngq\u012b j\u01d0?", en: "What day is it today?" },
    { id: "s_t05", group: "g_time", pattern: "p10", zh: "我想等一会儿。", pinyin: "w\u01d2 xi\u01ceng d\u011bng y\u00edhu\u00ecr.", en: "I want to wait a little while." },
    { id: "s_t06", group: "g_time", pattern: "p23", zh: "我每天七点起床。", pinyin: "w\u01d2 m\u011biti\u0101n q\u012b di\u01cen q\u01d0chu\u00e1ng.", en: "I get up at seven every day." },
    { id: "s_t07", group: "g_time", pattern: "p13", zh: "明天我去学校。", pinyin: "m\u00edngti\u0101n w\u01d2 q\u00f9 xu\u00e9xi\u00e0o.", en: "Tomorrow I go to school." },
    { id: "s_t08", group: "g_time", pattern: "p25", zh: "我现在很忙。", pinyin: "w\u01d2 xi\u00e0nz\u00e0i h\u011bn m\u00e1ng.", en: "I am very busy now." },
    { id: "s_w01", group: "g_work_study", pattern: "p24", zh: "我在公司工作。", pinyin: "w\u01d2 z\u00e0i g\u014dngs\u012b g\u014dngzu\u00f2.", en: "I work at a company." },
    { id: "s_w02", group: "g_work_study", pattern: "p24", zh: "我在学校学习中文。", pinyin: "w\u01d2 z\u00e0i xu\u00e9xi\u00e0o xu\u00e9x\u00ed Zh\u014dngw\u00e9n.", en: "I study Chinese at school." },
    { id: "s_w03", group: "g_work_study", pattern: "p10", zh: "我想学中文。", pinyin: "w\u01d2 xi\u01ceng xu\u00e9 Zh\u014dngw\u00e9n.", en: "I want to study Chinese." },
    { id: "s_w04", group: "g_work_study", pattern: "p21", zh: "我不会说中文。", pinyin: "w\u01d2 b\u00fa hu\u00ec shu\u014d Zh\u014dngw\u00e9n.", en: "I cannot speak Chinese." },
    { id: "s_w05", group: "g_work_study", pattern: "p21", zh: "我会说一点中文。", pinyin: "w\u01d2 hu\u00ec shu\u014d y\u00ecdi\u01cen Zh\u014dngw\u00e9n.", en: "I can speak a little Chinese." },
    { id: "s_w06", group: "g_work_study", pattern: "p25", zh: "这个工作很有意思。", pinyin: "zh\u00e8ge g\u014dngzu\u00f2 h\u011bn y\u01d2u y\u00ecsi.", en: "This job is very interesting." },
    { id: "s_w07", group: "g_work_study", pattern: "p22", zh: "我没有时间。", pinyin: "w\u01d2 m\u00e9iy\u01d2u sh\u00edji\u0101n.", en: "I don't have time." },
    { id: "s_w08", group: "g_work_study", pattern: "p22", zh: "你有问题吗？", pinyin: "n\u01d0 y\u01d2u w\u00e8nt\u00ed ma?", en: "Do you have a question?" },
    { id: "s_w09", group: "g_work_study", pattern: "p23", zh: "我每天学中文。", pinyin: "w\u01d2 m\u011biti\u0101n xu\u00e9 Zh\u014dngw\u00e9n.", en: "I study Chinese every day." },
    { id: "s_e01", group: "g_feelings", pattern: "p25", zh: "我觉得很累。", pinyin: "w\u01d2 ju\u00e9de h\u011bn l\u00e8i.", en: "I feel very tired." },
    { id: "s_e02", group: "g_feelings", pattern: "p25", zh: "我很高兴。", pinyin: "w\u01d2 h\u011bn g\u0101ox\u00ecng.", en: "I am very happy." },
    { id: "s_e03", group: "g_feelings", pattern: "p09", zh: "太好了！", pinyin: "t\u00e0i h\u01ceo le!", en: "Great!" },
    { id: "s_e04", group: "g_feelings", pattern: "p26", zh: "谢谢！", pinyin: "xi\u00e8xie!", en: "Thank you!" },
    { id: "s_e05", group: "g_feelings", pattern: "p27", zh: "对不起，我来晚了。", pinyin: "du\u00ecbuq\u01d0, w\u01d2 l\u00e1i w\u01cen le.", en: "Sorry, I am late." },
    { id: "s_e06", group: "g_feelings", pattern: "p14", zh: "我很喜欢这部电影。", pinyin: "w\u01d2 h\u011bn x\u01d0huan zh\u00e8 b\u00f9 di\u00e0ny\u01d0ng.", en: "I like this movie a lot." },
    { id: "s_e07", group: "g_feelings", pattern: "p15", zh: "我不喜欢下雨。", pinyin: "w\u01d2 b\u00f9 x\u01d0huan xi\u00e0y\u01d4.", en: "I don't like rain." },
    { id: "s_e08", group: "g_feelings", pattern: "p26", zh: "你帮了我很多忙。", pinyin: "n\u01d0 b\u0101ng le w\u01d2 h\u011bn du\u014d m\u00e1ng.", en: "You helped me a lot." },
    { id: "s_x01", group: "g_weather", pattern: "p28", zh: "今天天气怎么样？", pinyin: "j\u012bnti\u0101n ti\u0101nq\u00ec z\u011bnmey\u00e0ng?", en: "How is the weather today?" },
    { id: "s_x02", group: "g_weather", pattern: "p28", zh: "明天天气怎么样？", pinyin: "m\u00edngti\u0101n ti\u0101nq\u00ec z\u011bnmey\u00e0ng?", en: "How is the weather tomorrow?" },
    { id: "s_x03", group: "g_weather", pattern: "p29", zh: "今天下雨了。", pinyin: "j\u012bnti\u0101n xi\u00e0y\u01d4 le.", en: "It is raining today." },
    { id: "s_x04", group: "g_weather", pattern: "p09", zh: "今天太热了。", pinyin: "j\u012bnti\u0101n t\u00e0i r\u00e8 le.", en: "It is too hot today." },
    { id: "s_x05", group: "g_weather", pattern: "p25", zh: "我觉得很冷。", pinyin: "w\u01d2 ju\u00e9de h\u011bn l\u011bng.", en: "I feel very cold." },
    { id: "s_x06", group: "g_weather", pattern: "p09", zh: "风太大了。", pinyin: "f\u0113ng t\u00e0i d\u00e0 le.", en: "The wind is too strong." },
    { id: "s_x07", group: "g_weather", pattern: "p11", zh: "我要一把伞。", pinyin: "w\u01d2 y\u00e0o y\u00ec b\u01ce s\u01cen.", en: "I want an umbrella." },
    { id: "s_m01", group: "g_family", pattern: "p30", zh: "我住在北京。", pinyin: "w\u01d2 zh\u00f9 z\u00e0i B\u011bij\u012bng.", en: "I live in Beijing." },
    { id: "s_m02", group: "g_family", pattern: "p06", zh: "这是我的家。", pinyin: "zh\u00e8 sh\u00ec w\u01d2 de ji\u0101.", en: "This is my home." },
    { id: "s_m03", group: "g_family", pattern: "p06", zh: "这是我的妈妈。", pinyin: "zh\u00e8 sh\u00ec w\u01d2 de m\u0101ma.", en: "This is my mother." },
    { id: "s_m04", group: "g_family", pattern: "p22", zh: "我有一个哥哥。", pinyin: "w\u01d2 y\u01d2u y\u00ed ge g\u0113ge.", en: "I have an older brother." },
    { id: "s_m05", group: "g_family", pattern: "p22", zh: "我没有孩子。", pinyin: "w\u01d2 m\u00e9iy\u01d2u h\u00e1izi.", en: "I don't have children." },
    { id: "s_m06", group: "g_family", pattern: "p05", zh: "我姐姐是老师。", pinyin: "w\u01d2 ji\u011bjie sh\u00ec l\u01ceosh\u012b.", en: "My older sister is a teacher." },
    { id: "s_m07", group: "g_family", pattern: "p22", zh: "我妈妈有一辆车。", pinyin: "w\u01d2 m\u0101ma y\u01d2u y\u00ed li\u00e0ng ch\u0113.", en: "My mother has a car." },
    { id: "s_m08", group: "g_family", pattern: "p10", zh: "我想家。", pinyin: "w\u01d2 xi\u01ceng ji\u0101.", en: "I miss home." },
    { id: "s_m09", group: "g_family", pattern: "p05", zh: "我们是一家人。", pinyin: "w\u01d2men sh\u00ec y\u00ec ji\u0101 r\u00e9n.", en: "We are one family." }
  ]
};
