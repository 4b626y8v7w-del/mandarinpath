// Grammar & usage notes for absolute beginners.
// Fed to the app as window.MP_GRAMMAR = { notes: [...] }
// Each note: id, unit (u1..u9), title, body (plain English, max 220 chars),
// zh (example in characters), pinyin (tone marks), en (English), warn (optional).
// Teaching order: tones -> particles -> word order -> time/place ->
// measure words -> common errors for English speakers.
window.MP_GRAMMAR = {
  notes: [
    // ---------------------------------------------------------------- u1 TONES
    {
      id: "g001", unit: "u1", title: "Tone 1: high and level",
      body: "Tone 1 is a flat, high sound, like singing a steady note. It never rises or falls. If you keep the pitch even, you already sound natural.",
      zh: "妈，杯子在桌上。",
      pinyin: "Mā, bēizi zài zhuō shàng.",
      en: "Mom, the cup is on the table.",
      warn: "English speakers often drop tone 1 to a neutral mid level."
    },
    {
      id: "g002", unit: "u1", title: "Tone 2: rising",
      body: "Tone 2 starts low and glides upward, like asking a yes/no question in English, only gentler. It is the syllable ma in mā versus má.",
      zh: "我姓马。",
      pinyin: "Wǒ xìng Mǎ.",
      en: "My surname is Ma.",
      warn: "Do not let it fall like an English statement."
    },
    {
      id: "g003", unit: "u1", title: "Tone 3: dipping",
      body: "Tone 3 is the hardest tone. It falls low, then lifts. In isolation it dips, but inside a phrase it often sounds only low-dipping.",
      zh: "我很好。",
      pinyin: "Wǒ hěn hǎo.",
      en: "I am very well."
    },
    {
      id: "g004", unit: "u1", title: "Tone 4: falling",
      body: "Tone 4 starts high and drops sharply, like giving a firm command. It is short and decisive, not long and trailing.",
      zh: "这是我的书。",
      pinyin: "Zhè shì wǒ de shū.",
      en: "This is my book.",
      warn: "English speakers let tone 4 fall too slowly."
    },
    {
      id: "g005", unit: "u1", title: "Tone 3 in a two-syllable word",
      body: "When a two-syllable word has two third tones, the first one becomes second tone. Say nǐ hǎo as ní hǎo out loud, then relax.",
      zh: "你好，我是李明。",
      pinyin: "Ní hǎo, wǒ shì Lǐ Míng.",
      en: "Hello, I am Li Ming."
    },
    {
      id: "g006", unit: "u1", title: "Tone 3 before a fourth tone",
      body: "A third tone right before a fourth tone is spoken as second tone, so it is easy to say. 不 bù and 你 nǐ become bú and ní.",
      zh: "你不对。",
      pinyin: "Ní bú duì.",
      en: "You are not right."
    },
    {
      id: "g007", unit: "u1", title: "The particle bu changes tone",
      body: "Before a fourth tone, 不 is pronounced second tone (bú). Before any other tone it stays fourth tone (bù). 不 before a fourth tone also means not at all.",
      zh: "我不去，你也别去。",
      pinyin: "Wǒ bù qù, nǐ yě bié qù.",
      en: "I am not going, and you should not go either.",
      warn: "Not before first tone: 不 is bù, not bú."
    },
    {
      id: "g008", unit: "u1", title: "The number one changes tone",
      body: "一 is first tone by itself, but before a fourth tone it becomes fourth tone (yí), and before the other tones it becomes second tone (yì).",
      zh: "我有三个哥哥和一个妹妹。",
      pinyin: "Wǒ yǒu sān gē gē, yí ge mèimei.",
      en: "I have three older brothers and one younger sister."
    },
    {
      id: "g009", unit: "u1", title: "The neutral tone",
      body: "Some syllables are unstressed and spoken light and short with no tone, like English 'uh' in 'about'. Common examples are 子, 头, 们, and the particle 了.",
      zh: "桌子上有三个本子。",
      pinyin: "Zhuōzi shàng yǒu sān ge běnzi.",
      en: "There are three notebooks on the table."
    },
    {
      id: "g010", unit: "u1", title: "One syllable, four different words",
      body: "The same syllable can mean four different things, and only the tone tells them apart. Learn new words with their tone, never bare.",
      zh: "妈麻马骂，她说对不起。",
      pinyin: "Mā, má, mǎ, mà. Tā shuō duìbuqǐ.",
      en: "Mom, hemp, horse, scold. She said sorry."
    },

    // ------------------------------------------------------------ u2 PARTICLES
    {
      id: "g011", unit: "u2", title: "de for possession",
      body: "的 links a noun to its owner and always comes after the owner. Say my, your, his, her, its, our, their with 的.",
      zh: "这是我的手机。",
      pinyin: "Zhè shì wǒ de shàojī.",
      en: "This is my phone.",
      warn: "Do not say 我的 for the English 'my of' constructions; keep 的 off when nothing is owned."
    },
    {
      id: "g012", unit: "u2", title: "de after an adjective",
      body: "的 also joins an adjective to the noun it describes. It is a real word here, like a full form of English 's, so say it clearly.",
      zh: "我有一本红色的书。",
      pinyin: "Wǒ yǒu yì běn hóngsè de shū.",
      en: "I have a red book.",
      warn: "Drop 的 when the adjective already stands alone: 我很高兴, not 高兴的."
    },
    {
      id: "g013", unit: "u2", title: "de after a demonstrative",
      body: "This and that, 这 and 那, are adjectives. When they point at a noun, put 的 between them: 这个老师, 那些学生.",
      zh: "那个女孩是我的同学。",
      pinyin: "Nà ge nǚhái shì wǒ de tóngxué.",
      en: "That girl is my classmate.",
      warn: "Say 那 (fourth tone) for that, not nà with the second tone."
    },
    {
      id: "g014", unit: "u2", title: "de, di, du: which is which",
      body: "的 is the possessive or describing particle, pronounced de. 地 marks how an action happens, and is often spoken with a light tone. 都 means all.",
      zh: "她高兴地说了一句话。",
      pinyin: "Tā gāoxìng de shuō le yí jù huà.",
      en: "She happily said one sentence."
    },
    {
      id: "g015", unit: "u2", title: "地 marks manner",
      body: "地 links an adverb to the verb that follows. English adverbs often disappear in Chinese, so use 地 when you want to keep the detail.",
      zh: "他慢慢地走了。",
      pinyin: "Tā mànmàn de zǒu le.",
      en: "He walked away slowly."
    },
    {
      id: "g016", unit: "u2", title: "le marks a completed action",
      body: "Put 了 after the verb to show the action is finished. It is the past tense of Mandarin and needs no other change.",
      zh: "我吃了午饭。",
      pinyin: "Wǒ chī le wǔfàn.",
      en: "I ate lunch.",
      warn: "Chinese has one past tense. Do not look for tense on the verb itself."
    },
    {
      id: "g017", unit: "u2", title: "le in a chain of verbs",
      body: "With several verbs, only the last one takes 了. The other verbs stay plain, so the sentence has one clear completion point.",
      zh: "我买了咖啡，喝了，然后去上班。",
      pinyin: "Wǒ mǎi le kāfēi, hē le, ránhòu qù shàngbān.",
      en: "I bought coffee, drank it, then went to work.",
      warn: "Do not put 了 after every verb."
    },
    {
      id: "g018", unit: "u2", title: "le also means a change of state",
      body: "A second job for 了: something is different now. Ask and answer 吃饭了吗 shows whether someone has eaten yet.",
      zh: "你吃饭了吗？",
      pinyin: "Nǐ chīfàn le ma?",
      en: "Have you eaten?"
    },
    {
      id: "g019", unit: "u2", title: "zhe points at something new",
      body: "着 at the end of a sentence marks a current situation, like English 'right now' or 'is in the middle of'.",
      zh: "门开着呢。",
      pinyin: "Mén kāizhe ne.",
      en: "The door is open.",
      warn: "Use 了 for finished actions and 着 for situations still happening."
    },
    {
      id: "g020", unit: "u2", title: "ma makes a question",
      body: "Adding 吗 turns any statement into a yes/no question. The word order and the tones of the rest of the sentence stay exactly the same.",
      zh: "你是学生吗？",
      pinyin: "Nǐ shì xuéshēng ma?",
      en: "Are you a student?",
      warn: "Do not rise the tone at the end; the particle 吗 already asks."
    },
    {
      id: "g021", unit: "u2", title: "ne asks for confirmation",
      body: "呢 is softer than 吗 and asks what you think, or bounces a question back. Nothing changes in the rest of the sentence.",
      zh: "你呢？",
      pinyin: "Nǐ ne?",
      en: "And you?"
    },
    {
      id: "g022", unit: "u2", title: "ba makes a suggestion",
      body: "吧 at the end proposes, invites, or guesses together. It makes your statement sound like a friendly offer.",
      zh: "我们走吧。",
      pinyin: "Wǒmen zǒu ba.",
      en: "Let's go.",
      warn: "吧 is not a question marker; no rising intonation needed."
    },
    {
      id: "g023", unit: "u2", title: "men makes a plural",
      body: "Add 们 to a person or some people to say plural: 我 to 我们. It is a quick suffix, not a separate word you stress.",
      zh: "他们都是我的同学。",
      pinyin: "Tāmen dōu shì wǒ de tóngxué.",
      en: "They are all my classmates.",
      warn: "No 们 after things, and none after a pronoun already inside a word like 他们."
    },
    {
      id: "g024", unit: "u2", title: "ba marks the object moved forward",
      body: "把 lifts the object and puts it before the verb. Use it when the thing is being acted on, and follow it with 得 to show the result.",
      zh: "我把书放在桌子上了。",
      pinyin: "Wǒ bǎ shū fàng zài zhuōzi shàng le.",
      en: "I have put the book on the table.",
      warn: "If you cannot say what is done to what, do not use 把 yet."
    },
    {
      id: "g025", unit: "u2", title: "bei for passive voice",
      body: "被 marks a subject that receives the action, like English 'is done to'. The thing being acted on comes right after 被.",
      zh: "我的手机被偷了。",
      pinyin: "Wǒ de shàojī bèi tōu le.",
      en: "My phone was stolen.",
      warn: "被 makes the subject passive. If the subject does the action, do not use it."
    },
    {
      id: "g026", unit: "u2", title: "The passive double",
      body: "A formal passive uses 被 for the action and 把 to name what happened to it. Everyday speech often drops 被 and keeps the sentence plain.",
      zh: "门被人关上了。",
      pinyin: "Mén bèi rén guānshàng le.",
      en: "The door was closed by someone.",
      warn: "Do not stack 被 and 把 in the same clause; use one or the other."
    },
    {
      id: "g027", unit: "u2", title: "It's just like that",
      body: "It's nothing, really. It softens a compliment, an apology, or praise, and can sound a little defensive if overused.",
      zh: "没什么，就那样。",
      pinyin: "Méishénme, jiù nàyàng.",
      en: "It's nothing, it's just like that."
    },

    // ----------------------------------------------------------- u3 WORD ORDER
    {
      id: "g028", unit: "u3", title: "Subject, verb, object",
      body: "The basic order is exactly subject then verb then object. Chinese keeps it, so do not move the verb in front of the subject as English questions do.",
      zh: "我喜欢学中文。",
      pinyin: "Wǒ xǐhuān xué Zhōngwén.",
      en: "I like studying Chinese."
    },
    {
      id: "g029", unit: "u3", title: "Time comes before place",
      body: "When both appear, say the time first, then the place. That is the opposite of English, which often puts the place first.",
      zh: "我上午在学校。",
      pinyin: "Wǒ shàngwǔ zài xuéxiào.",
      en: "In the morning I am at school.",
      warn: "In English you would say 'at school in the morning'. Do not copy that order."
    },
    {
      id: "g030", unit: "u3", title: "A long time phrase can lead",
      body: "If the time phrase is long, it can move to the very front of the sentence, before the subject. It is polite and very common in speech.",
      zh: "昨天晚上八点，我给我妈妈打了电话。",
      pinyin: "Zuótiān wǎnshang bā diǎn, wǒ gěi wǒ māma dǎ le diànhuà.",
      en: "At eight last night I called my mother.",
      warn: "Short time phrases stay in the normal place, after the subject."
    },
    {
      id: "g031", unit: "u3", title: "Adjective plus de plus noun",
      body: "English adjectives take no helper, but Chinese usually adds 的 between the adjective and its noun. Say it clearly; it is not optional here.",
      zh: "这是一个有趣的地方。",
      pinyin: "Zhè shì yí ge yǒuqù de dìfang.",
      en: "This is an interesting place."
    },
    {
      id: "g032", unit: "u3", title: "Adjective straight before a verb",
      body: "Before a verb, an adjective needs no 的 at all. This is where learners over-add 的 and make a mistake.",
      zh: "我累，但是我想跑步。",
      pinyin: "Wǒ lèi, dànshì wǒ xiǎng pǎobù.",
      en: "I am tired, but I want to run.",
      warn: "Say 累, not 累的, before 想跑步."
    },
    {
      id: "g033", unit: "u3", title: "Adverbs go before the verb",
      body: "Words like 很 very, 不 not, 都 all, 也 also, and 快 nearly are verbs in Chinese and sit directly in front of the verb.",
      zh: "我也吃了一点儿。",
      pinyin: "Wǒ yě chī le yìdiǎnr.",
      en: "I also ate a little."
    },
    {
      id: "g034", unit: "u3", title: "很 needs a word after it",
      body: "很 is a full verb meaning very and cannot stand alone. It always takes an adjective, and it softens any adjective you put after it.",
      zh: "今天很热。",
      pinyin: "Jīntiān hěn rè.",
      en: "It is very hot today.",
      warn: "Do not say 很 for every English 'very'; native speakers drop it most of the time."
    },
    {
      id: "g035", unit: "u3", title: "le sits outside the verb phrase",
      body: "In a sentence with several verbs, put 了 after the last one. That way it marks the whole action as finished, not just one verb.",
      zh: "我昨天去买了菜。",
      pinyin: "Wǒ zuótiān qù mǎi le cài.",
      en: "Yesterday I went and bought vegetables."
    },

    // ------------------------------------------------------------- u6 TIME/PLACE
    {
      id: "g036", unit: "u6", title: "zai means at a location",
      body: "在 marks where something is or happens. It goes before the place and is a preposition, so nothing comes between it and the place.",
      zh: "我在图书馆。",
      pinyin: "Wǒ zài túshūguǎn.",
      en: "I am at the library.",
      warn: "No 在 for possession. My book is at school is wrong."
    },
    {
      id: "g037", unit: "u6", title: "shi also marks a place",
      body: "是 marks a place when you are arriving there or naming it as a destination or a venue. Compare 我在上海 for staying, 我到上海 for arriving.",
      zh: "我到上海了。",
      pinyin: "Wǒ dào Shànghǎi le.",
      en: "I have arrived in Shanghai."
    },
    {
      id: "g038", unit: "u6", title: "zai or shi: which one",
      body: "Use 在 for staying somewhere and 是 for identity or arriving. Say 我在上海 means I live or am located there; 我是上海人 names who you are.",
      zh: "我是北京人，但现在在上海。",
      pinyin: "Wǒ shì Běijīn rén, dàn xiànzài zài Shànghǎi.",
      en: "I am from Beijing, but now I am in Shanghai.",
      warn: "Never use 是 to mean 'my ... is' for a thing you own."
    },
    {
      id: "g039", unit: "u6", title: "zai also marks an event location",
      body: "在 is used for where something happens as well as where someone is. It comes before the place and before the verb that follows.",
      zh: "我们在学校开会。",
      pinyin: "Wǒmen zài xuéxiào kāihuì.",
      en: "We are holding a meeting at school."
    },
    {
      id: "g040", unit: "u6", title: "zai plus a place plus an activity",
      body: "After 在 and a place you often add a short verb phrase. It adds detail the way an English prepositional phrase does.",
      zh: "他在门口等你。",
      pinyin: "Tā zài ménkǒu děng nǐ.",
      en: "He is waiting for you at the door."
    },
    {
      id: "g041", unit: "u6", title: "dian means a little",
      body: "点 as a quantity means a little bit and goes before a noun. 一点 is the neutral form; 一点儿 sounds softer and more casual.",
      zh: "我买了一点儿水果。",
      pinyin: "Wǒ mǎi le yìdiǎnr shuǐguǒ.",
      en: "I bought a little fruit.",
      warn: "Do not use 一些 by default; 点 and 一点儿 are more natural in speech."
    },
    {
      id: "g042", unit: "u6", title: "shenmeshi means for a while",
      body: "什么时间 or 什么时候 means when, and 什么 is often shortened to 么 in speech. A minute or two is 一点儿时间, not 一个小时.",
      zh: "你等一下儿，我马上就好。",
      pinyin: "Nǐ děng yíxiàr, wǒ mǎshàng jiù hǎo.",
      en: "Wait a moment, I'll be ready right away."
    },
    {
      id: "g043", unit: "u6", title: "Year, month, day order",
      body: "Say the year, then the month, then the day. Numbers are read digit by digit for the year, and the day is often shorter than the English form.",
      zh: "今天是2024年10月1日。",
      pinyin: "Jīntiān shì èr líng èr sì nián shí yuè yī rì.",
      en: "Today is October 1, 2024.",
      warn: "Chinese reads 2024 as individual digits, not 'two thousand twenty-four'."
    },
    {
      id: "g044", unit: "u6", title: "Weekdays and weekends",
      body: "Weekdays use 星期 with a number. 星期天, 星期日, and 周末 all mean Sunday and the weekend.",
      zh: "我星期五晚上有空。",
      pinyin: "Wǒ xīngqī wǔ yèwǎn yǒu kòng.",
      en: "I am free on Friday evening."
    },
    {
      id: "g045", unit: "u6", title: "OClock and half past",
      body: "Say the hour first, then 点, then the minutes. 8 means 8 o'clock, 8:05 is 8点5分, and 8:30 is 8点半.",
      zh: "现在三点十分。",
      pinyin: "Xiànzài sān diǎn shí fēn.",
      en: "It is ten past three now."
    },
    {
      id: "g046", unit: "u6", title: "Time of day words",
      body: "上午 covers morning, 下午 afternoon, and 晚上 evening. They come in that order before a place or another time phrase.",
      zh: "我上午在学校，晚上在家。",
      pinyin: "Wǒ shàngwǔ zài xuéxiào, wǎnshang zài jiā.",
      en: "I am at school in the morning and at home in the evening.",
      warn: "Do not use 晚上 for the afternoon."
    },
    {
      id: "g047", unit: "u6", title: "When, at the time",
      body: "…的时候 means when something happens and works for the past, present, or future. Put it right after the word it describes.",
      zh: "他吃饭的时候我在打电话。",
      pinyin: "Tā chīfàn de shíhou wǒ zài dǎ diànhuà.",
      en: "When he was eating I was on the phone."
    },
    {
      id: "g048", unit: "u6", title: "Now and just now",
      body: "现在 means now, 刚才 means just now, and 马上 means immediately. English tenses become these separate time words.",
      zh: "我刚才在这儿，现在去那边。",
      pinyin: "Wǒ gāngcái zài zhèr, xiànzài qù nàbiān.",
      en: "I was just here, and now I am going over there."
    },
    {
      id: "g049", unit: "u6", title: "Here and there",
      body: "这儿 and 这边 both mean here, and 那儿 and 那边 both mean there. 这 and 那 are the front pair and the back pair.",
      zh: "你的书在哪儿？在这儿。",
      pinyin: "Nǐ de shū zài nǎr? Zài zhèr.",
      en: "Where is your book? Here."
    },
    {
      id: "g050", unit: "u6", title: "On, in, under",
      body: "Location words follow the place word: 上 on or above, 里 inside, 下 under or below, 旁边 beside, 中间 in the middle.",
      zh: "钥匙在桌子下面。",
      pinyin: "Yàoshi zài zhuōzi xiàmian.",
      en: "The key is under the table."
    },
    {
      id: "g051", unit: "u6", title: "Qu to go, dao to reach",
      body: "去 marks movement away from where you are, and 到 marks arriving at a destination. English uses one verb for both.",
      zh: "我去学校，然后到公司。",
      pinyin: "Wǒ qù xuéxiào, ránhòu dào gōngsī.",
      en: "I go to school, then arrive at the office.",
      warn: "Do not translate both as 'go to'."
    },

    // ---------------------------------------------------------- u7 MEASURE WORDS
    {
      id: "g052", unit: "u7", title: "Classifiers are obligatory",
      body: "Between the number and the noun there is always a measure word, even in English-free speech. 个 is the safe default for everyday things.",
      zh: "我有一个哥哥。",
      pinyin: "Wǒ yǒu yí ge gēge.",
      en: "I have one older brother."
    },
    {
      id: "g053", unit: "u7", title: "One, then classifier, then noun",
      body: "The order is always number plus measure word plus noun, with 的 and other words after the noun. Never put the noun before the number.",
      zh: "三只小猫在睡觉。",
      pinyin: "Sān zhī xiǎomāo zài shuìjiào.",
      en: "Three kittens are sleeping."
    },
    {
      id: "g054", unit: "u7", title: "Classifiers show shape, not plural",
      body: "Chinese measure words describe what kind of thing or animal something is. They are not plurals, so there is no difference between one and more.",
      zh: "一只猫，两只猫。",
      pinyin: "Yì zhī māo, liǎng zhī māo.",
      en: "One cat, two cats."
    },
    {
      id: "g055", unit: "u7", title: "ge for people and things",
      body: "个 is the general-purpose classifier. Use it for people, objects, places, and ideas when you are not sure which one fits.",
      zh: "这是一个问题。",
      pinyin: "Zhè shì yí ge wèntí.",
      en: "This is a problem."
    },
    {
      id: "g056", unit: "u7", title: "ben for books",
      body: "本 counts bound or rolled objects, above all books, notebooks, dictionaries, and scripts. It is the English word 'volume' in meaning.",
      zh: "我买了两本中文书。",
      pinyin: "Wǒ mǎi le liǎng běn Zhōngwénshū.",
      en: "I bought two Chinese books."
    },
    {
      id: "g057", unit: "u7", title: "zhang for flat things",
      body: "张 counts flat, wide surfaces: paper, photos, tables, beds, mouths, and tickets. Use it instead of 个 for anything sheet-like.",
      zh: "请给我一张纸。",
      pinyin: "Qǐng gěi wǒ yì zhāng zhǐ.",
      en: "Please give me a sheet of paper."
    },
    {
      id: "g058", unit: "u7", title: "zhi for animals",
      body: "只 counts animals and a few other living things such as birds and insects. 一只狗 is natural; 一个人 uses 个 instead.",
      zh: "外面有一只狗。",
      pinyin: "Wàimiàn yǒu yì zhī gǒu.",
      en: "There is a dog outside."
    },
    {
      id: "g059", unit: "u7", title: "bei for cups and bowls",
      body: "杯 counts cups, glasses, bowls, and mugs. 瓶 is for bottles, 罐 for cans and jars, and 盒 for boxes.",
      zh: "我要一杯咖啡。",
      pinyin: "Wǒ yào yì bēi kāfēi.",
      en: "I want a cup of coffee."
    },
    {
      id: "g060", unit: "u7", title: "Measure words come before the demonstrative",
      body: "For a specific thing, put the measure word before this or that: 那本书. 你那本书 is fine too, but the noun must follow 的.",
      zh: "你喜欢那本书吗？",
      pinyin: "Nǐ xǐhuān nà běn shū ma?",
      en: "Do you like that book?"
    },
    {
      id: "g061", unit: "u7", title: "Little amounts use different words",
      body: "A few small things use 点 for countable items and 些 for a general small quantity. Both come before the noun.",
      zh: "我想要一些水。",
      pinyin: "Wǒ xiǎng yào yìxiē shuǐ.",
      en: "I would like a little water.",
      warn: "Some measure words take 几, not 点: 几本书."
    },
    {
      id: "g062", unit: "u7", title: "Dou means both",
      body: "都 goes before the verb and means both or all. It goes with a measure word for objects but comes before the verb, never after it.",
      zh: "他们都会说中文。",
      pinyin: "Tāmen dōu huì shuō Zhōngwén.",
      en: "They all can speak Chinese."
    },
    {
      id: "g063", unit: "u7", title: "Try, moment, little",
      body: "Try an action once is 一下, and a short stretch of time is 一会儿. They go after the verb: 看一下, 等一会儿.",
      zh: "请等一会儿。",
      pinyin: "Qǐng děng yíhuìr.",
      en: "Please wait a moment.",
      warn: "A moment is 一下 or 一会儿, never 一个小时."
    },

    // --------------------------------------------------------- u8 COMMON ERRORS
    {
      id: "g064", unit: "u8", title: "Error: English word order",
      body: "Chinese keeps subject, verb, object. English questions and negatives move the verb; Chinese never does. 不 and 没 always stay before the verb.",
      zh: "我不喝咖啡。",
      pinyin: "Wǒ bù hē kāfēi.",
      en: "I do not drink coffee.",
      warn: "Not 我喝不咖啡."
    },
    {
      id: "g065", unit: "u8", title: "Error: using zai for possession",
      body: "在 means where something is, not who owns it. Possession takes a noun plus 的: 我的书. 我的书在学校 is fine.",
      zh: "我的包在这儿。",
      pinyin: "Wǒ de bāo zài zhèr.",
      en: "My bag is here."
    },
    {
      id: "g066", unit: "u8", title: "Error: using shi for possession",
      body: "是 means is in the sense of identity, not in the sense of 'have'. 'I have a book' is 我有一本书, never 我是书.",
      zh: "我有一本书。",
      pinyin: "Wǒ yǒu yì běn shū.",
      en: "I have a book."
    },
    {
      id: "g067", unit: "u8", title: "Error: leaving out the measure word",
      body: "Dropping the measure word sounds telegraphic and sometimes funny. Say 三个 rather than 三 alone when a number is involved.",
      zh: "我要两杯水。",
      pinyin: "Wǒ yào liǎng bēi shuǐ.",
      en: "I want two cups of water."
    },
    {
      id: "g068", unit: "u8", title: "Error: too much le",
      body: "Add 了 only for a completed action or a new state. Present habits and future plans do not take it, unlike English past tense habits.",
      zh: "我以前住在上海。",
      pinyin: "Wǒ yǐqián zhù zài Shànghǎi.",
      en: "I used to live in Shanghai."
    },
    {
      id: "g069", unit: "u8", title: "Error: full name instead of given name",
      body: "Chinese given names stand alone. Say Xiao Wang or Lao Wang for Mr Wang, not Mr Wang Wei or Mr Wangming Wei.",
      zh: "这是王老师。",
      pinyin: "Zhè shì Wáng lǎoshī.",
      en: "This is Teacher Wang."
    },
    {
      id: "g070", unit: "u8", title: "Error: translating at as zai",
      body: "Chinese has no exact at for destinations. Use 到 when arriving and 在 when staying, and put 在 before the place with nothing between.",
      zh: "我明天到北京。",
      pinyin: "Wǒ míngtiān dào Běijīng.",
      en: "I am going to arrive in Beijing tomorrow."
    }
  ]
};