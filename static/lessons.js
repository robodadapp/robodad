/* RoboDad language practice: curated beginner lessons and role-play scenes.
   Every phrase here was written by hand (not generated on the fly), so lessons
   are the same for everyone and can be checked by a fluent speaker.
   Hindi lines carry Devanagari (t), Roman letters (r) and English (e). */
(function(){
  const fr = {
    name: "French", native: "Français", voice: "fr-CA", hello: "Bonjour",
    lessons: [
      { id:"greet", title:"Hellos and goodbyes", tip:"In Québec you'll hear \"Allô !\" for hi, too.", p:[
        { t:"Bonjour !", e:"Hello! / Good morning!" },
        { t:"Salut !", e:"Hi! (casual)" },
        { t:"Ça va ?", e:"How's it going?" },
        { t:"Ça va bien, merci.", e:"I'm doing well, thanks." },
        { t:"À plus tard !", e:"See you later!" } ] },
      { id:"me", title:"All about you", tip:"Enchanté if you're a guy, enchantée if you're a girl. Sounds the same, spelled different. Classic French.", p:[
        { t:"Je m'appelle Sam.", e:"My name is Sam." },
        { t:"Comment tu t'appelles ?", e:"What's your name?" },
        { t:"J'ai quinze ans.", e:"I'm fifteen." },
        { t:"J'habite à Toronto.", e:"I live in Toronto." },
        { t:"Enchanté !", e:"Nice to meet you!" } ] },
      { id:"polite", title:"Magic words", tip:"Use vous with adults you don't know and tu with friends. Dad rule: when in doubt, vous.", p:[
        { t:"S'il vous plaît.", e:"Please. (polite)" },
        { t:"Merci beaucoup !", e:"Thank you very much!" },
        { t:"De rien.", e:"You're welcome." },
        { t:"Excusez-moi.", e:"Excuse me." },
        { t:"Pardon ?", e:"Sorry? (I didn't catch that)" } ] },
      { id:"cafe", title:"At the café", tip:"\"Je voudrais\" (I would like) is politer than \"Je veux\" (I want). Servers notice.", p:[
        { t:"Je voudrais un croissant.", e:"I'd like a croissant." },
        { t:"Un chocolat chaud, s'il vous plaît.", e:"A hot chocolate, please." },
        { t:"C'est combien ?", e:"How much is it?" },
        { t:"L'addition, s'il vous plaît.", e:"The bill, please." },
        { t:"C'est délicieux !", e:"It's delicious!" } ] },
      { id:"school", title:"School survival", tip:"\"Tu peux répéter ?\" will save you in every French class. Use it without shame.", p:[
        { t:"J'ai un test demain.", e:"I have a test tomorrow." },
        { t:"Mon cours préféré, c'est les maths.", e:"My favourite class is math." },
        { t:"Je n'ai pas compris.", e:"I didn't understand." },
        { t:"Tu peux répéter ?", e:"Can you say that again?" },
        { t:"Comment dit-on « pencil » en français ?", e:"How do you say \"pencil\" in French?" } ] },
      { id:"around", title:"Getting around", tip:"In Montréal the subway is le métro. Same as Paris, fewer accordions.", p:[
        { t:"Où est le métro ?", e:"Where is the subway?" },
        { t:"À gauche.", e:"To the left." },
        { t:"À droite.", e:"To the right." },
        { t:"Tout droit.", e:"Straight ahead." },
        { t:"C'est loin ?", e:"Is it far?" } ] },
      { id:"feel", title:"How you feel", tip:"Add an e when a girl is speaking: contente, fatiguée, stressée.", p:[
        { t:"Je suis content.", e:"I'm happy." },
        { t:"Je suis fatigué.", e:"I'm tired." },
        { t:"J'ai faim.", e:"I'm hungry. (literally: I have hunger)" },
        { t:"Je suis stressé.", e:"I'm stressed." },
        { t:"Pas de souci !", e:"No worries!" } ] },
      { id:"fun", title:"Weekend plans", tip:"In Québec the weekend is often la fin de semaine. You'll sound like a local.", p:[
        { t:"J'aime jouer au soccer.", e:"I like playing soccer." },
        { t:"J'écoute de la musique.", e:"I'm listening to music." },
        { t:"Tu fais quoi ce week-end ?", e:"What are you doing this weekend?" },
        { t:"On joue aux jeux vidéo ?", e:"Want to play video games?" },
        { t:"C'est génial !", e:"That's awesome!" } ] },
    ],
    scenes: [
      { id:"cafe", title:"Café in Montréal", who:"Dad's the server", open:"Bonjour ! Bienvenue au café. Qu'est-ce que je vous sers ? (Hi! Welcome to the café. What can I get you?)", hints:["Je voudrais un croissant.", "Un chocolat chaud, s'il vous plaît.", "C'est combien ?"] },
      { id:"intro", title:"New classmate", who:"Dad's the new kid", open:"Salut ! Je suis nouveau ici. Comment tu t'appelles ? (Hi! I'm new here. What's your name?)", hints:["Je m'appelle…", "J'ai quinze ans.", "Enchanté !"] },
      { id:"directions", title:"Lost in Québec City", who:"Dad's a friendly local", open:"Bonjour ! Vous avez l'air perdu. Je peux vous aider ? (Hello! You look lost. Can I help you?)", hints:["Où est le métro ?", "C'est loin ?", "Merci beaucoup !"] },
      { id:"shop", title:"Hoodie shopping", who:"Dad's the cashier", open:"Bonjour ! Vous cherchez quelque chose ? (Hello! Are you looking for something?)", hints:["Je voudrais un hoodie.", "C'est combien ?", "Merci, bonne journée !"] },
      { id:"free", title:"Just chat", who:"Dad asks about your day", open:"Salut ! Ça va ? Qu'est-ce que tu as fait aujourd'hui ? (Hi! How's it going? What did you do today?)", hints:["Ça va bien, merci.", "J'ai un test demain.", "Je suis fatigué."] },
    ],
  };

  const hi = {
    name: "Hindi", native: "हिन्दी", voice: "hi-IN", hello: "Namaste",
    lessons: [
      { id:"greet", title:"Hellos and goodbyes", tip:"Namaste works with everyone, any time of day. Fold your hands for bonus points.", p:[
        { t:"नमस्ते!", r:"Namaste!", e:"Hello!" },
        { t:"आप कैसे हैं?", r:"Aap kaise hain?", e:"How are you? (polite)" },
        { t:"मैं ठीक हूँ।", r:"Main theek hoon.", e:"I'm fine." },
        { t:"धन्यवाद!", r:"Dhanyavaad!", e:"Thank you!" },
        { t:"फिर मिलेंगे!", r:"Phir milenge!", e:"See you again!" } ] },
      { id:"me", title:"All about you", tip:"Guys say ka and rehta, girls say ki and rehti. Hindi verbs care who's talking.", p:[
        { t:"मेरा नाम सैम है।", r:"Mera naam Sam hai.", e:"My name is Sam." },
        { t:"आपका नाम क्या है?", r:"Aapka naam kya hai?", e:"What's your name?" },
        { t:"मैं पंद्रह साल का हूँ।", r:"Main pandrah saal ka hoon.", e:"I'm fifteen. (girls: ki)" },
        { t:"मैं टोरंटो में रहता हूँ।", r:"Main Toronto mein rehta hoon.", e:"I live in Toronto. (girls: rehti)" },
        { t:"आपसे मिलकर खुशी हुई।", r:"Aapse milkar khushi hui.", e:"Nice to meet you." } ] },
      { id:"polite", title:"Magic words", tip:"Add ji to be respectful: haan ji, nahin ji. Aunties love it.", p:[
        { t:"कृपया", r:"Kripya", e:"Please (formal)" },
        { t:"शुक्रिया!", r:"Shukriya!", e:"Thanks!" },
        { t:"कोई बात नहीं।", r:"Koi baat nahin.", e:"No problem. / It's okay." },
        { t:"माफ़ कीजिए।", r:"Maaf kijiye.", e:"Excuse me. / Sorry." },
        { t:"जी हाँ।", r:"Ji haan.", e:"Yes. (polite)" } ] },
      { id:"chai", title:"At the chai stall", tip:"\"Dijiye\" is the polite way to say give me. Say it and the chai tastes better. Science.", p:[
        { t:"एक चाय दीजिए।", r:"Ek chai dijiye.", e:"One chai, please." },
        { t:"दो समोसे भी।", r:"Do samose bhi.", e:"Two samosas too." },
        { t:"कितने पैसे हुए?", r:"Kitne paise hue?", e:"How much is it?" },
        { t:"बहुत स्वादिष्ट है!", r:"Bahut swaadisht hai!", e:"It's really tasty!" },
        { t:"चीनी कम, प्लीज़।", r:"Cheeni kam, please.", e:"Less sugar, please." } ] },
      { id:"school", title:"School survival", tip:"Kal means both yesterday and tomorrow. Hindi keeps you on your toes.", p:[
        { t:"कल मेरा टेस्ट है।", r:"Kal mera test hai.", e:"I have a test tomorrow." },
        { t:"मेरा पसंदीदा विषय गणित है।", r:"Mera pasandeeda vishay ganit hai.", e:"My favourite subject is math." },
        { t:"मुझे समझ नहीं आया।", r:"Mujhe samajh nahin aaya.", e:"I didn't understand." },
        { t:"फिर से बोलिए?", r:"Phir se boliye?", e:"Could you say it again?" },
        { t:"इसे हिंदी में क्या कहते हैं?", r:"Ise Hindi mein kya kehte hain?", e:"What's this called in Hindi?" } ] },
      { id:"around", title:"Getting around", tip:"Seedhe, baayein, daayein: that's every auto-rickshaw ride sorted.", p:[
        { t:"बाज़ार कहाँ है?", r:"Bazaar kahaan hai?", e:"Where is the market?" },
        { t:"बाएँ", r:"Baayein", e:"Left" },
        { t:"दाएँ", r:"Daayein", e:"Right" },
        { t:"सीधे", r:"Seedhe", e:"Straight ahead" },
        { t:"कितनी दूर है?", r:"Kitni door hai?", e:"How far is it?" } ] },
      { id:"feel", title:"How you feel", tip:"In Hindi hunger \"attaches\" to you: mujhe bhookh lagi hai. Very dramatic. Very accurate.", p:[
        { t:"मैं खुश हूँ।", r:"Main khush hoon.", e:"I'm happy." },
        { t:"मुझे नींद आ रही है।", r:"Mujhe neend aa rahi hai.", e:"I'm sleepy." },
        { t:"मुझे भूख लगी है।", r:"Mujhe bhookh lagi hai.", e:"I'm hungry." },
        { t:"मुझे प्यास लगी है।", r:"Mujhe pyaas lagi hai.", e:"I'm thirsty." },
        { t:"कोई टेंशन नहीं!", r:"Koi tension nahin!", e:"No worries!" } ] },
      { id:"fun", title:"Family and fun", tip:"Chalo means let's go, come on, or okay. One word, many jobs. Like dad.", p:[
        { t:"ये मेरे पापा हैं।", r:"Ye mere papa hain.", e:"This is my dad." },
        { t:"मुझे क्रिकेट खेलना पसंद है।", r:"Mujhe cricket khelna pasand hai.", e:"I like playing cricket." },
        { t:"चलो, गाना सुनते हैं!", r:"Chalo, gaana sunte hain!", e:"Come on, let's listen to a song!" },
        { t:"बहुत मज़ा आया!", r:"Bahut mazaa aaya!", e:"That was so much fun!" },
        { t:"वाह, कमाल है!", r:"Waah, kamaal hai!", e:"Wow, that's amazing!" } ] },
    ],
    scenes: [
      { id:"chai", title:"Chai stall", who:"Dad's the chaiwala", open:"नमस्ते! क्या लोगे? चाय, समोसा? (Namaste! Kya loge? Chai, samosa? = Hello! What'll you have? Chai, samosa?)", hints:["Ek chai dijiye.", "Do samose bhi.", "Kitne paise hue?"] },
      { id:"family", title:"Chatty uncle", who:"Dad's your uncle at a family visit", open:"अरे, कितने बड़े हो गए! पढ़ाई कैसी चल रही है? (Arre, kitne bade ho gaye! Padhai kaisi chal rahi hai? = Wow, look how big you've got! How's school going?)", hints:["Main theek hoon.", "Kal mera test hai.", "Mujhe cricket khelna pasand hai."] },
      { id:"auto", title:"Auto-rickshaw ride", who:"Dad's the driver", open:"हाँ जी, कहाँ जाना है? (Haan ji, kahaan jaana hai? = Yes, where do you need to go?)", hints:["Bazaar jaana hai.", "Kitne paise?", "Kitni door hai?"] },
      { id:"market", title:"Fruit market", who:"Dad's the fruit seller", open:"आइए, आइए! ताज़े आम हैं! क्या चाहिए? (Aaiye, aaiye! Taaze aam hain! Kya chahiye? = Come, come! Fresh mangoes! What do you need?)", hints:["Do aam dijiye.", "Kitne paise hue?", "Shukriya!"] },
      { id:"free", title:"Just chat", who:"Dad asks about your day", open:"नमस्ते! आज आपका दिन कैसा था? (Namaste! Aaj aapka din kaisa tha? = Hello! How was your day today?)", hints:["Main khush hoon.", "Mujhe neend aa rahi hai.", "Bahut mazaa aaya!"] },
    ],
  };


  const es = {
    name: "Spanish", native: "Español", voice: "es-MX", hello: "Hola",
    lessons: [
      { id:"greet", title:"Hellos and goodbyes", tip:"Spanish questions start with an upside-down ¿ so you know a question is coming. Very considerate.", p:[
        { t:"¡Hola!", e:"Hi!" },
        { t:"Buenos días.", e:"Good morning." },
        { t:"¿Qué tal?", e:"How's it going?" },
        { t:"Muy bien, gracias.", e:"Very well, thanks." },
        { t:"¡Hasta luego!", e:"See you later!" } ] },
      { id:"me", title:"All about you", tip:"In Spanish you \"have\" your age: tengo quince años, literally \"I have fifteen years\".", p:[
        { t:"Me llamo Sam.", e:"My name is Sam." },
        { t:"¿Cómo te llamas?", e:"What's your name?" },
        { t:"Tengo quince años.", e:"I'm fifteen." },
        { t:"Vivo en Toronto.", e:"I live in Toronto." },
        { t:"¡Mucho gusto!", e:"Nice to meet you!" } ] },
      { id:"polite", title:"Magic words", tip:"Use usted with adults you don't know and tú with friends. Dad rule: when in doubt, usted.", p:[
        { t:"Por favor.", e:"Please." },
        { t:"¡Muchas gracias!", e:"Thank you very much!" },
        { t:"De nada.", e:"You're welcome." },
        { t:"Perdón.", e:"Sorry. / Excuse me." },
        { t:"¿Cómo?", e:"Sorry? (I didn't catch that)" } ] },
      { id:"food", title:"At the taco stand", tip:"\"Quisiera\" (I'd like) is politer than \"Quiero\" (I want). Abuelas notice.", p:[
        { t:"Quisiera tres tacos, por favor.", e:"I'd like three tacos, please." },
        { t:"Un agua de horchata, por favor.", e:"A horchata, please." },
        { t:"¿Cuánto cuesta?", e:"How much is it?" },
        { t:"La cuenta, por favor.", e:"The bill, please." },
        { t:"¡Está delicioso!", e:"It's delicious!" } ] },
      { id:"school", title:"School survival", tip:"\"¿Puedes repetir?\" will save you in every Spanish class. Use it without shame.", p:[
        { t:"Tengo un examen mañana.", e:"I have a test tomorrow." },
        { t:"Mi clase favorita es matemáticas.", e:"My favourite class is math." },
        { t:"No entiendo.", e:"I don't understand." },
        { t:"¿Puedes repetir?", e:"Can you say that again?" },
        { t:"¿Cómo se dice «pencil» en español?", e:"How do you say \"pencil\" in Spanish?" } ] },
      { id:"around", title:"Getting around", tip:"The ñ in baño sounds like the ny in canyon. Which is also a great place to need one.", p:[
        { t:"¿Dónde está el baño?", e:"Where is the bathroom?" },
        { t:"A la izquierda.", e:"To the left." },
        { t:"A la derecha.", e:"To the right." },
        { t:"Todo recto.", e:"Straight ahead." },
        { t:"¿Está lejos?", e:"Is it far?" } ] },
      { id:"feel", title:"How you feel", tip:"Change the o to an a when a girl is speaking: contenta, cansada, estresada.", p:[
        { t:"Estoy contento.", e:"I'm happy." },
        { t:"Estoy cansado.", e:"I'm tired." },
        { t:"Tengo hambre.", e:"I'm hungry. (literally: I have hunger)" },
        { t:"Estoy estresado.", e:"I'm stressed." },
        { t:"¡No pasa nada!", e:"No worries!" } ] },
      { id:"fun", title:"Weekend plans", tip:"Fútbol means soccer. Ask for American football and you'll get a puzzled look.", p:[
        { t:"Me gusta jugar al fútbol.", e:"I like playing soccer." },
        { t:"Escucho música.", e:"I'm listening to music." },
        { t:"¿Qué haces este fin de semana?", e:"What are you doing this weekend?" },
        { t:"¿Jugamos videojuegos?", e:"Want to play video games?" },
        { t:"¡Qué padre!", e:"That's awesome! (Mexico)" } ] },
    ],
    scenes: [
      { id:"tacos", title:"Taco stand in Mexico City", who:"Dad's the taquero", open:"¡Buenas! ¿Qué le sirvo, joven? (Hi there! What can I get you, young one?)", hints:["Quisiera tres tacos, por favor.", "¿Cuánto cuesta?", "¡Está delicioso!"] },
      { id:"intro", title:"New classmate", who:"Dad's the new kid", open:"¡Hola! Soy nuevo aquí. ¿Cómo te llamas? (Hi! I'm new here. What's your name?)", hints:["Me llamo…", "Tengo quince años.", "¡Mucho gusto!"] },
      { id:"directions", title:"Lost in Madrid", who:"Dad's a friendly local", open:"¡Hola! Pareces perdido. ¿Te ayudo? (Hi! You look lost. Can I help you?)", hints:["¿Dónde está el metro?", "¿Está lejos?", "¡Muchas gracias!"] },
      { id:"shop", title:"Sneaker shopping", who:"Dad's the shop assistant", open:"¡Hola! ¿Buscas algo? (Hi! Looking for something?)", hints:["Quisiera unos tenis.", "¿Cuánto cuestan?", "Gracias, ¡adiós!"] },
      { id:"free", title:"Just chat", who:"Dad asks about your day", open:"¡Hola! ¿Qué tal? ¿Qué hiciste hoy? (Hi! How's it going? What did you do today?)", hints:["Muy bien, gracias.", "Tengo un examen mañana.", "Estoy cansado."] },
    ],
  };

  // Marathi and Bengali: "talk to your folks" family courses. Phrases are for home:
  // parents, grandparents and relatives, not tourist situations. New in v1.22 and
  // still being checked by fluent speakers.
  const mr = {
    name: "Marathi", native: "मराठी", voice: "mr-IN", hello: "Namaskar", review: true,
    lessons: [
      { id:"greet", title:"Hellos at home", tip:"Marathi verbs care who's talking: a boy says aalo and bara, a girl says aale and bari.", p:[
        { t:"नमस्कार!", r:"Namaskar!", e:"Hello! (respectful)" },
        { t:"मी घरी आलो!", r:"Mi ghari aalo!", e:"I'm home! (girls: aale)" },
        { t:"कसं काय?", r:"Kasa kay?", e:"How's it going? (casual)" },
        { t:"मी बरा आहे.", r:"Mi bara aahe.", e:"I'm fine. (girls: bari)" },
        { t:"शुभ रात्री!", r:"Shubh ratri!", e:"Good night!" } ] },
      { id:"family", title:"Who's who", tip:"Dad's sister is Atya, Mom's sister is Mavshi. Mix them up and someone will correct you within seconds. Lovingly.", p:[
        { t:"आई आणि बाबा", r:"Aai aani Baba", e:"Mom and Dad" },
        { t:"आजी आणि आजोबा", r:"Aaji aani Ajoba", e:"Grandma and Grandpa" },
        { t:"काका आणि आत्या", r:"Kaka aani Atya", e:"Dad's brother and Dad's sister" },
        { t:"मामा आणि मावशी", r:"Mama aani Mavshi", e:"Mom's brother and Mom's sister" },
        { t:"दादा आणि ताई", r:"Dada aani Tai", e:"Older brother and older sister" } ] },
      { id:"food", title:"Food talk", tip:"Asking \"jevlis ka?\" is how Marathi families say I care about you. Expect a second helping.", p:[
        { t:"तू जेवलीस का?", r:"Tu jevlis ka?", e:"Did you eat? (to Aai)" },
        { t:"आज जेवायला काय आहे?", r:"Aaj jevayla kay aahe?", e:"What's for dinner today?" },
        { t:"मला भूक लागली आहे.", r:"Mala bhook lagli aahe.", e:"I'm hungry." },
        { t:"खूप छान झालंय!", r:"Khup chhan zalay!", e:"This turned out really good!" },
        { t:"पुरे, पोट भरलं!", r:"Pure, pot bharla!", e:"Enough, I'm full!" } ] },
      { id:"elders", title:"Talking to elders", tip:"Use tumhi with grandparents. Grandpa is \"kase aahat\", Grandma is \"kasha aahat\". Get it right and watch them smile.", p:[
        { t:"आजोबा, तुम्ही कसे आहात?", r:"Ajoba, tumhi kase aahat?", e:"Grandpa, how are you?" },
        { t:"आजी, तुम्ही कशा आहात?", r:"Aaji, tumhi kasha aahat?", e:"Grandma, how are you?" },
        { t:"तुम्ही जेवलात का?", r:"Tumhi jevlat ka?", e:"Did you eat? (respectful)" },
        { t:"मला मदत कराल का?", r:"Mala madat karal ka?", e:"Could you help me? (respectful)" },
        { t:"आशीर्वाद द्या.", r:"Aashirvaad dya.", e:"Please bless me." } ] },
      { id:"feel", title:"How you feel", tip:"In Marathi sleep and boredom \"come\" to you: mala zop yetey. Very relatable.", p:[
        { t:"मी खूश आहे.", r:"Mi khush aahe.", e:"I'm happy." },
        { t:"मला झोप येतेय.", r:"Mala zop yetey.", e:"I'm sleepy." },
        { t:"मी थकलो आहे.", r:"Mi thaklo aahe.", e:"I'm tired. (girls: thakle)" },
        { t:"मला कंटाळा आलाय.", r:"Mala kantala aalay.", e:"I'm bored." },
        { t:"काही टेन्शन नाही!", r:"Kahi tension nahi!", e:"No worries!" } ] },
      { id:"plans", title:"Coming and going", tip:"Always tell Aai where you're going and when you'll be back. In any language. Trust me.", p:[
        { t:"मी बाहेर जातोय.", r:"Mi baher jatoy.", e:"I'm heading out. (girls: jatey)" },
        { t:"आज मला उशीर होईल.", r:"Aaj mala ushir hoil.", e:"I'll be late today." },
        { t:"मी लवकर येतो.", r:"Mi lavkar yeto.", e:"I'll be back soon. (girls: yete)" },
        { t:"शाळा छान होती.", r:"Shala chhan hoti.", e:"School was good." },
        { t:"उद्या माझी परीक्षा आहे.", r:"Udya mazi pariksha aahe.", e:"I have a test tomorrow." } ] },
      { id:"heart", title:"Saying it", tip:"Ask a grandparent what they did when they were little. Clear your schedule. Bring snacks.", p:[
        { t:"मला माफ करा.", r:"Mala maaf kara.", e:"I'm sorry. (respectful)" },
        { t:"धन्यवाद!", r:"Dhanyavaad!", e:"Thank you!" },
        { t:"मला तुमची आठवण येते.", r:"Mala tumchi aathvan yete.", e:"I miss you. (respectful)" },
        { t:"आई, माझं तुझ्यावर खूप प्रेम आहे.", r:"Aai, maza tujhyavar khup prem aahe.", e:"Mom, I love you so much." },
        { t:"तुम्ही लहान असताना काय करायचात?", r:"Tumhi lahan astana kay karaychat?", e:"What did you do when you were little?" } ] },
      { id:"fest", title:"Festivals", tip:"Shubhechha means best wishes and works for almost every festival. Gudi Padwa is the Marathi new year, in spring.", p:[
        { t:"दिवाळीच्या हार्दिक शुभेच्छा!", r:"Diwalichya hardik shubhechha!", e:"Happy Diwali!" },
        { t:"गुढीपाडव्याच्या हार्दिक शुभेच्छा!", r:"Gudhipadvyachya hardik shubhechha!", e:"Happy Gudi Padwa! (Marathi new year)" },
        { t:"गणपती बाप्पा मोरया!", r:"Ganpati Bappa Morya!", e:"Hail Ganpati Bappa! (Ganeshotsav)" },
        { t:"वाढदिवसाच्या हार्दिक शुभेच्छा!", r:"Vaadhdivsachya hardik shubhechha!", e:"Happy birthday!" },
        { t:"तिळगूळ घ्या, गोड गोड बोला!", r:"Tilgul ghya, god god bola!", e:"Have a sesame sweet and speak sweetly! (Sankranti)" } ] },
    ],
    scenes: [
      { id:"home", title:"Home from school", who:"Dad's your Aai", open:"आलं का माझं बाळ? शाळा कशी होती? (Aala ka maza baal? Shala kashi hoti? = Is my little one home? How was school?)", hints:["Mi ghari aalo!", "Shala chhan hoti.", "Aaj jevayla kay aahe?"] },
      { id:"aaji", title:"Phone call with Aaji", who:"Dad's your Aaji on the phone", open:"हॅलो बाळा! कसं काय? जेवण झालं का? (Hello bala! Kasa kay? Jevan zala ka? = Hello dear! How's it going? Have you eaten?)", hints:["Aaji, tumhi kasha aahat?", "Mi bara aahe.", "Mala tumchi aathvan yete."] },
      { id:"diwali", title:"Diwali visit", who:"Dad's your Kaka", open:"अरे वा, आलात सगळे! दिवाळीच्या हार्दिक शुभेच्छा! (Are va, aalat sagle! Diwalichya hardik shubhechha! = Oh wow, you've all come! Happy Diwali!)", hints:["Diwalichya hardik shubhechha!", "Aashirvaad dya.", "Dhanyavaad!"] },
      { id:"dinner", title:"Dinner table", who:"Dad's your Baba", open:"चला, जेवायला बसा! आज वरण-भात आहे. (Chala, jevayla basa! Aaj varan-bhaat aahe. = Come, sit down to eat! It's dal-rice today.)", hints:["Mala bhook lagli aahe.", "Khup chhan zalay!", "Pure, pot bharla!"] },
      { id:"free", title:"Just chat", who:"Dad asks about your day", open:"नमस्कार! आज दिवस कसा होता? (Namaskar! Aaj divas kasa hota? = Hello! How was your day today?)", hints:["Mi khush aahe.", "Mala kantala aalay.", "Udya mazi pariksha aahe."] },
    ],
  };

  const bn = {
    name: "Bengali", native: "বাংলা", voice: "bn-IN", hello: "Nomoshkar", review: true,
    lessons: [
      { id:"greet", title:"Hellos at home", tip:"Bengali verbs don't change for boys or girls. One less thing to worry about. You're welcome.", p:[
        { t:"নমস্কার!", r:"Nomoshkar!", e:"Hello! (respectful)" },
        { t:"আমি বাড়ি এসে গেছি!", r:"Ami bari eshe gechhi!", e:"I'm home!" },
        { t:"কী খবর?", r:"Ki khobor?", e:"What's up?" },
        { t:"আমি ভালো আছি।", r:"Ami bhalo achhi.", e:"I'm fine." },
        { t:"শুভ রাত্রি!", r:"Shubho ratri!", e:"Good night!" } ] },
      { id:"family", title:"Who's who", tip:"Many Bangladeshi families say Ammu, Abbu, Dadi and Nani instead. Ask your folks which words your family uses.", p:[
        { t:"মা আর বাবা", r:"Ma aar Baba", e:"Mom and Dad" },
        { t:"ঠাকুমা আর দিদিমা", r:"Thakuma aar Didima", e:"Dad's mom and Mom's mom" },
        { t:"কাকু আর পিসি", r:"Kaku aar Pishi", e:"Dad's brother and Dad's sister" },
        { t:"মামা আর মাসি", r:"Mama aar Mashi", e:"Mom's brother and Mom's sister" },
        { t:"দাদা আর দিদি", r:"Dada aar Didi", e:"Older brother and older sister" } ] },
      { id:"food", title:"Food talk", tip:"\"Khide peyechhe\" means hunger has found you. Very dramatic. Very accurate.", p:[
        { t:"তুমি খেয়েছ?", r:"Tumi kheyechho?", e:"Did you eat?" },
        { t:"আজ কী রান্না হয়েছে?", r:"Aaj ki ranna hoyechhe?", e:"What got cooked today?" },
        { t:"আমার খিদে পেয়েছে।", r:"Amar khide peyechhe.", e:"I'm hungry." },
        { t:"খুব ভালো হয়েছে!", r:"Khub bhalo hoyechhe!", e:"This turned out really good!" },
        { t:"আর না, পেট ভরে গেছে!", r:"Aar na, pet bhore gechhe!", e:"No more, I'm full!" } ] },
      { id:"elders", title:"Talking to elders", tip:"Most kids say tumi to Ma, Baba and grandparents. Apni is for formal elders, like a teacher or a guest.", p:[
        { t:"তুমি কেমন আছ?", r:"Tumi kemon achho?", e:"How are you?" },
        { t:"আপনি কেমন আছেন?", r:"Apni kemon achhen?", e:"How are you? (formal)" },
        { t:"আমাকে একটু সাহায্য করবে?", r:"Amake ektu shahajjo korbe?", e:"Can you help me a little?" },
        { t:"আশীর্বাদ করো।", r:"Ashirbad koro.", e:"Please bless me." },
        { t:"দাদু, একটা গল্প বলো না!", r:"Dadu, ekta golpo bolo na!", e:"Grandpa, tell me a story!" } ] },
      { id:"feel", title:"How you feel", tip:"Darun means awesome. Use it often. Uncles will be delighted.", p:[
        { t:"আমি খুশি।", r:"Ami khushi.", e:"I'm happy." },
        { t:"আমার ঘুম পাচ্ছে।", r:"Amar ghum pachchhe.", e:"I'm sleepy." },
        { t:"আমি ক্লান্ত।", r:"Ami klanto.", e:"I'm tired." },
        { t:"আমার বোর লাগছে।", r:"Amar bor lagchhe.", e:"I'm bored." },
        { t:"দারুণ!", r:"Darun!", e:"Awesome!" } ] },
      { id:"plans", title:"Coming and going", tip:"Ektu means a little, and it softens everything. \"Ektu baire jachchhi\" sounds much nicer to Ma.", p:[
        { t:"আমি একটু বাইরে যাচ্ছি।", r:"Ami ektu baire jachchhi.", e:"I'm heading out for a bit." },
        { t:"আজ আমার দেরি হবে।", r:"Aaj amar deri hobe.", e:"I'll be late today." },
        { t:"আমি তাড়াতাড়ি ফিরব।", r:"Ami taratari phirbo.", e:"I'll be back soon." },
        { t:"স্কুল ভালো ছিল।", r:"School bhalo chhilo.", e:"School was good." },
        { t:"কাল আমার পরীক্ষা আছে।", r:"Kaal amar porikkha achhe.", e:"I have a test tomorrow." } ] },
      { id:"heart", title:"Saying it", tip:"Ask a grandparent what they did when they were little. Clear your schedule. Bring snacks.", p:[
        { t:"আমাকে ক্ষমা করো।", r:"Amake khoma koro.", e:"Sorry, please forgive me." },
        { t:"ধন্যবাদ!", r:"Dhonnobad!", e:"Thank you!" },
        { t:"তোমার কথা খুব মনে পড়ে।", r:"Tomar kotha khub mone pore.", e:"I miss you a lot." },
        { t:"মা, আমি তোমাকে খুব ভালোবাসি।", r:"Ma, ami tomake khub bhalobashi.", e:"Mom, I love you so much." },
        { t:"তুমি ছোটবেলায় কী করতে?", r:"Tumi chhotobelay ki korte?", e:"What did you do when you were little?" } ] },
      { id:"fest", title:"Festivals", tip:"After Durga Puja, everyone says Shubho Bijoya and touches elders' feet. Sweets follow. Lots of sweets.", p:[
        { t:"শুভ শারদীয়া!", r:"Shubho Sharodiya!", e:"Happy Durga Puja!" },
        { t:"শুভ বিজয়া!", r:"Shubho Bijoya!", e:"Happy Bijoya! (after Durga Puja)" },
        { t:"শুভ নববর্ষ!", r:"Shubho Noboborsho!", e:"Happy New Year! (Poila Boishakh)" },
        { t:"ঈদ মোবারক!", r:"Eid Mubarak!", e:"Happy Eid!" },
        { t:"শুভ জন্মদিন!", r:"Shubho Jonmodin!", e:"Happy birthday!" } ] },
    ],
    scenes: [
      { id:"home", title:"Home from school", who:"Dad's your Ma", open:"এসেছিস? স্কুল কেমন হল? (Eshechhish? School kemon holo? = You're back? How was school?)", hints:["Ami bari eshe gechhi!", "School bhalo chhilo.", "Aaj ki ranna hoyechhe?"] },
      { id:"dadu", title:"Phone call with Dadu", who:"Dad's your Dadu on the phone", open:"হ্যালো সোনা! কেমন আছিস? খেয়েছিস? (Hello shona! Kemon achhish? Kheyechhish? = Hello sweetheart! How are you? Have you eaten?)", hints:["Ami bhalo achhi.", "Tumi kemon achho?", "Tomar kotha khub mone pore."] },
      { id:"puja", title:"Durga Puja visit", who:"Dad's your Mama", open:"আরে, এসে গেছিস! শুভ শারদীয়া! ঠাকুর দেখতে যাবি? (Aare, eshe gechhish! Shubho Sharodiya! Thakur dekhte jabi? = Hey, you made it! Happy Puja! Want to go pandal-hopping?)", hints:["Shubho Sharodiya!", "Darun!", "Ashirbad koro."] },
      { id:"dinner", title:"Dinner table", who:"Dad's your Baba", open:"চল, খেতে বস! আজ মাছের ঝোল হয়েছে। (Chol, khete bosh! Aaj maachher jhol hoyechhe. = Come, sit down to eat! There's fish curry today.)", hints:["Amar khide peyechhe.", "Khub bhalo hoyechhe!", "Aar na, pet bhore gechhe!"] },
      { id:"free", title:"Just chat", who:"Dad asks about your day", open:"নমস্কার! আজ তোমার দিন কেমন কাটল? (Nomoshkar! Aaj tomar din kemon katlo? = Hello! How did your day go?)", hints:["Ami khushi.", "Amar ghum pachchhe.", "Kaal amar porikkha achhe."] },
    ],
  };

  window.LESSONS = { fr, es, hi, mr, bn };
})();
