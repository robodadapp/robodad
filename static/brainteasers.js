/* RoboDad brain teasers: the puzzle content. The game itself lives in brain.js.
   Every puzzle here is written by hand and its answer is checked (scripts/check_brain.js),
   so the answer key is never made up on the fly.
   - Multiple choice: "ok" is the right answer, "no" holds exactly three wrong ones; the app shuffles them.
   - Type-in ("kind":"type"): "answer" is shown, "accept" lists what counts as right (case and spaces ignored).
   - Hands-on puzzles (lights, lock, river, tiles) are built by brain.js; the code-lock clues below
     were checked by brute force to have exactly one answer.
   Hints are revealed one at a time; the answer and "why" only show after a pick or a reveal.
   The "Ask Dad" coach uses the AI, told to give hints first, never the answer. */
(function(){
  const P = [
    // ---------- logic ----------
    { id:"bt01", type:"logic", q:"Four friends sit in a row at the movies. Cal is on the far left. Ava isn't on either end. Ben sits directly to Ava's right. Dee doesn't sit next to Cal. Who is sitting next to Dee?",
      hints:["Draw four seats and put Cal in seat 1.", "Ava must be in seat 2 or 3. Which one leaves Dee away from Cal?", "If Ava is in seat 3, Dee has to sit in seat 2, right next to Cal. So Ava is in seat 2."],
      ok:"Ben", no:["Ava", "Cal", "Nobody"],
      why:"The seats go Cal, Ava, Ben, Dee. Dee is on the far right, next to Ben." },

    { id:"bt02", type:"logic", q:"In the family group chat, Mum replies faster than Dad. Gran replies slower than Dad. Your brother replies faster than Mum. Who replies slowest?",
      hints:["Line them up from fastest to slowest.", "Your brother beats Mum, and Mum beats Dad.", "Where does Gran go compared with Dad?"],
      ok:"Gran", no:["Dad", "Mum", "Your brother"],
      why:"Fastest to slowest: your brother, Mum, Dad, Gran." },

    { id:"bt03", type:"logic", q:"Sam is taller than Jo. Jo is taller than Max. Max is taller than Lee. Who is the second shortest?",
      hints:["Put them in order from tallest to shortest.", "Lee is the shortest of all.", "Who comes just above Lee?"],
      ok:"Max", no:["Jo", "Lee", "Sam"],
      why:"Tallest to shortest: Sam, Jo, Max, Lee. Second shortest is Max." },

    { id:"bt04", type:"logic", q:"Robo-Grandpa always lies on Mondays, Tuesdays and Wednesdays, and tells the truth the rest of the week. Today he says: \"I lied yesterday.\" What day could it be?",
      hints:["Try two cases: today is a lying day, or today is a truth day.", "If he's lying today, then he did NOT lie yesterday. Which lying day comes right after a truth day?", "If he's telling the truth today, then yesterday was a lying day. Which truth day comes right after a lying day?"],
      ok:"Monday or Thursday", no:["Only Monday", "Only Thursday", "Wednesday or Sunday"],
      why:"On Monday he's lying, so he really told the truth on Sunday. On Thursday he's honest, and he really did lie on Wednesday. Both work." },

    { id:"bt05", type:"logic", q:"Mia has as many brothers as sisters. Each of her brothers has twice as many sisters as brothers. How many kids are in the family?",
      hints:["Mia doesn't count herself as a sister, and a brother doesn't count himself as a brother.", "Say there are G girls. Mia sees G − 1 sisters, so there are G − 1 boys.", "Each boy sees G sisters and (G − 2) brothers. Set G = 2 × (G − 2)."],
      ok:"7", no:["5", "6", "8"],
      why:"There are 4 girls and 3 boys. Mia sees 3 sisters and 3 brothers. Each boy sees 4 sisters and 2 brothers." },

    { id:"bt06", type:"logic", q:"You have a 3-litre jug, a 5-litre jug and a tap. What's the fewest times you need to fill a jug from the tap to end up with exactly 4 litres?",
      hints:["You can pour water from one jug into the other, and empty a jug down the sink.", "Fill the 5, then pour it into the 3. What's left in the 5?", "Keep that 2 litres, move it into the empty 3-litre jug, then fill the 5 again…"],
      ok:"2", no:["1", "3", "4"],
      why:"Fill the 5, pour into the 3 (2 left). Empty the 3, pour the 2 in. Fill the 5 again and top up the 3 (that takes 1). Exactly 4 litres stay in the 5. Two fills." },

    { id:"bt07", type:"logic", q:"A coin lands heads 5 times in a row. What's the chance the next flip is heads?",
      hints:["Does the coin remember what happened before?", "Each flip is a fresh start."],
      ok:"1 in 2", no:["Less than 1 in 2", "More than 1 in 2", "1 in 32"],
      why:"A fair coin has no memory. Every flip is still 1 in 2, no matter what came before." },

    { id:"bt08", type:"logic", q:"You're in a dark room with a drawer holding 6 black socks and 6 white socks. How many socks do you have to grab to be sure you have a matching pair?",
      hints:["Think about the unluckiest way it could go.", "Your first two socks could be different colours.", "What happens with the third sock?"],
      ok:"3", no:["2", "7", "12"],
      why:"Two socks could be one of each colour. The third sock has to match one of them." },

    { id:"bt09", type:"logic", q:"A clock seen in a mirror looks like it says 9:15. What's the real time?",
      hints:["A mirror flips left and right, so the hands swap sides.", "The mirror time and the real time add up to 12:00.", "What do you add to 9:15 to get 12:00?"],
      ok:"2:45", no:["3:45", "9:45", "3:15"],
      why:"Mirror time and real time always add up to 12:00. 12:00 − 9:15 = 2:45." },

    { id:"bt10", type:"logic", q:"Your Wi-Fi PIN has 4 digits. They're all different, there are no zeros, each digit is bigger than the one before it, and they add up to 10. What's the PIN?",
      hints:["Start with the smallest digits you're allowed to use.", "The smallest four different digits without zero are 1, 2, 3 and 4.", "What do they add up to?"],
      ok:"1234", no:["1243", "2341", "1225"],
      why:"1 + 2 + 3 + 4 = 10, and any bigger digits would add up to more than 10. They have to go up, so it's 1234." },

    { id:"bt11", type:"logic", q:"A teacher writes TWELVE + ONE on the board. She says you can rearrange those exact letters into two other number words with the same total. Which ones?",
      hints:["TWELVE + ONE makes 13, so the new pair has to make 13 too.", "Count the letters: you have three E's, plus T, W, L, V, O and N.", "Try a number word with three E's in it."],
      ok:"ELEVEN + TWO", no:["TEN + THREE", "NINE + FOUR", "EIGHT + FIVE"],
      why:"ELEVEN + TWO uses exactly the same nine letters as TWELVE + ONE, and both make 13." },

    // ---------- number tricks ----------
    { id:"bt12", type:"number", q:"Dad is 3 times your age. In 12 years he'll be twice your age. How old are you now?",
      hints:["Call your age x. Dad is 3x.", "In 12 years you're x + 12 and he's 3x + 12.", "Solve 3x + 12 = 2 × (x + 12)."],
      ok:"12", no:["10", "14", "16"],
      why:"You're 12 and Dad is 36. In 12 years you're 24 and he's 48, which is exactly twice." },

    { id:"bt13", type:"number", q:"Your phone is at 20%. While it's charging it gains 1% a minute, but gaming loses 1% every 4 minutes. How many minutes until it hits 80%?",
      hints:["Work out what happens over 4 minutes.", "In 4 minutes it gains 4% and loses 1%, so it's up 3%.", "You need 60% more. How many 4-minute chunks is that?"],
      ok:"80", no:["60", "75", "100"],
      why:"It goes up 3% every 4 minutes. 60% ÷ 3% = 20 chunks, and 20 × 4 = 80 minutes." },

    { id:"bt14", type:"number", q:"A pizza has 8 slices. You eat a quarter of it. Your friend eats half of what's left. How many slices are left?",
      hints:["A quarter of 8 is how many slices?", "After you, there are 6 slices.", "Half of 6 is…"],
      ok:"3", no:["2", "4", "5"],
      why:"You eat 2 and leave 6. Your friend eats 3, so 3 are left." },

    { id:"bt15", type:"number", q:"Dad's playlist has 12 songs, each 4 minutes long. He skips every third song, and skipped songs take no time. How many minutes of music does he hear?",
      hints:["Which songs get skipped? Songs 3, 6, 9 and…", "He skips 4 songs.", "How many songs are left, and how long do they last?"],
      ok:"32", no:["36", "40", "48"],
      why:"He skips songs 3, 6, 9 and 12, so he plays 8 songs. 8 × 4 = 32 minutes." },

    { id:"bt16", type:"number", q:"It's 3:30. What's the angle between the hour hand and the minute hand?",
      hints:["The minute hand points straight at the 6.", "The hour hand isn't on the 3. It's halfway between the 3 and the 4.", "Each hour on the clock is 30°."],
      ok:"75°", no:["90°", "60°", "80°"],
      why:"The minute hand is on the 6. The hour hand is halfway from 3 to 4, which is 2½ hours away from the 6. 2½ × 30° = 75°." },

    { id:"bt17", type:"number", q:"Think of any number. Double it. Add 10. Halve it. Now take away the number you started with. What do you get?",
      hints:["Try it with 3, then try it with 50.", "Doubling and then halving cancel each other out.", "So what's left over from the 10?"],
      ok:"5", no:["10", "0", "It depends on your number"],
      why:"Doubling and halving cancel out, and halving the 10 leaves 5. Taking away your number leaves just 5, every time." },

    { id:"bt18", type:"number", q:"How many times do you write the digit 1 when you write every number from 1 to 20?",
      hints:["Don't forget 11 has two of them.", "Count 1 and 10 first.", "Then 11 to 19: that's nine numbers, and 11 has an extra one."],
      ok:"12", no:["10", "11", "13"],
      why:"1, 10, then 11 (two), 12, 13, 14, 15, 16, 17, 18, 19. That's 1 + 1 + 2 + 8 = 12." },

    { id:"bt19", type:"number", q:"A shirt costs $40. It's 25% off, and then you use a coupon for 10% off the sale price. What do you pay?",
      hints:["Do the discounts one at a time. They don't just add up to 35%.", "25% off $40 is $30.", "Now take 10% off $30."],
      ok:"$27", no:["$26", "$25", "$28"],
      why:"25% off makes it $30. 10% of $30 is $3, so you pay $27. That's more than 35% off would give you ($26)." },

    { id:"bt20", type:"number", q:"A video has 2,000 views on Monday. The views double every day. On which day does it pass 30,000?",
      hints:["Keep doubling: Tuesday is 4,000.", "Wednesday 8,000, Thursday 16,000…", "What's double 16,000?"],
      ok:"Friday", no:["Wednesday", "Thursday", "Saturday"],
      why:"Monday 2,000, Tuesday 4,000, Wednesday 8,000, Thursday 16,000, Friday 32,000." },

    { id:"bt21", type:"number", q:"School is 2 km away. You walk there at 4 km an hour and take the bus home at 20 km an hour. How many minutes do you spend travelling?",
      hints:["Do the two trips separately.", "At 4 km an hour, 2 km takes half an hour.", "At 20 km an hour, 2 km takes a tenth of an hour."],
      ok:"36", no:["24", "30", "40"],
      why:"Walking takes 30 minutes and the bus takes 6 minutes. 30 + 6 = 36." },

    { id:"bt22", type:"number", q:"A triangle is worth 3, a square is worth 4 and a pentagon is worth 5. What's a hexagon plus two triangles worth?",
      hints:["Each shape is worth its number of sides.", "How many sides does a hexagon have?"],
      ok:"12", no:["9", "10", "11"],
      why:"A hexagon has 6 sides, and two triangles are 3 + 3. 6 + 6 = 12." },

    // ---------- patterns ----------
    { id:"bt23", type:"pattern", q:"What comes next? 2, 6, 12, 20, 30, …",
      hints:["Look at the gaps between the numbers.", "The gaps are 4, 6, 8, 10…", "The next gap is 12."],
      ok:"42", no:["40", "36", "44"],
      why:"The gaps grow by 2 each time: 4, 6, 8, 10, 12. 30 + 12 = 42. (It's also 6 × 7.)" },

    { id:"bt24", type:"pattern", q:"What comes next? 3, 5, 9, 17, 33, …",
      hints:["Each number is about double the one before.", "Double it, then take one away."],
      ok:"65", no:["49", "63", "66"],
      why:"Each number is double the last, minus 1. 33 × 2 − 1 = 65." },

    { id:"bt25", type:"pattern", q:"What letter comes next? A, C, F, J, O, …",
      hints:["Count how many letters you skip each time.", "A to C is 2 steps, C to F is 3, F to J is 4…", "O to the next one is 6 steps."],
      ok:"U", no:["S", "T", "V"],
      why:"The steps grow by one: 2, 3, 4, 5, 6. Six letters after O is U." },

    { id:"bt26", type:"pattern", q:"What comes next? 1, 8, 27, 64, …",
      hints:["8 is 2 × 2 × 2.", "27 is 3 × 3 × 3.", "So the next one is 5 × 5 × 5."],
      ok:"125", no:["81", "100", "216"],
      why:"They're cubes: 1³, 2³, 3³, 4³, so next is 5³ = 125." },

    // ---------- riddles ----------
    { id:"bt27", type:"riddle", q:"What gets charged every night but never goes to court?",
      hints:["You probably own one.", "It lives in your pocket in the day.", "Plug it in before bed or it's dead by lunch."],
      ok:"Your phone", no:["A thief", "A lamp", "A credit card"],
      why:"Your phone gets charged every night, but it's never on trial." },

    { id:"bt28", type:"riddle", q:"I have lots of teeth but I never bite. I fix your look before you leave the house. What am I?",
      hints:["You'd find me in a bathroom.", "I go through your hair."],
      ok:"A comb", no:["A fork", "A saw", "A stapler"],
      why:"A comb has teeth that sort out your hair, and it never bites." },

    { id:"bt29", type:"riddle", q:"I go up when the rain comes down, and I'm useless on a windy day. What am I?",
      hints:["You hold me over your head.", "I fold up small when you don't need me."],
      ok:"An umbrella", no:["A kite", "A cloud", "A puddle"],
      why:"An umbrella goes up when it rains, and wind turns it inside out." },

    { id:"bt30", type:"riddle", q:"You can see me but you can't touch me. I fill a room but take up no space. What am I?",
      hints:["Nothing travels faster than me.", "Flip a switch and I'm there."],
      ok:"Light", no:["Air", "Sound", "A smell"],
      why:"Light fills a room and you can see it, but you can't touch it. Air takes up space, and you can't see sound or smells." },

    { id:"bt31", type:"riddle", q:"Which letter of the alphabet sounds like a hot drink?",
      hints:["Say the letters out loud.", "It's something you'd have with biscuits."],
      ok:"T", no:["C", "J", "B"],
      why:"T sounds like tea. C sounds like sea, J like jay (a bird), and B like bee." },

    { id:"bt32", type:"riddle", q:"I'm spelled the same forwards and backwards, and I'm what the clock says at 12 in the daytime. What am I?",
      hints:["Four letters.", "It's the middle of the day."],
      ok:"Noon", no:["Dawn", "Dusk", "Lunch"],
      why:"NOON reads the same both ways, and it means 12 in the daytime." },

    { id:"bt33", type:"riddle", q:"What has a neck but no head, and wears a cap?",
      hints:["You'd find one in the fridge.", "You twist the cap off to drink."],
      ok:"A bottle", no:["A giraffe", "A shirt", "A guitar"],
      why:"A bottle has a neck and a cap, but no head." },

    // ---------- type the answer ----------
    { id:"bt34", kind:"type", type:"number", q:"What's the smallest number you can divide evenly by 2, 3, 4, 5 and 6?",
      hints:["It has to be a multiple of 4 and of 3, so a multiple of 12.", "It also has to end in 0 or 5.", "Try 12 × 5."],
      answer:"60", accept:["60", "sixty"],
      why:"60 ÷ 2 = 30, 60 ÷ 3 = 20, 60 ÷ 4 = 15, 60 ÷ 5 = 12, 60 ÷ 6 = 10. Nothing smaller works." },

    { id:"bt35", kind:"type", type:"riddle", q:"Unscramble these letters to find what you're talking to right now: T O B O R",
      hints:["It's a five-letter word.", "Beep boop."],
      answer:"ROBOT", accept:["robot"],
      why:"TOBOR unscrambles to ROBOT. It's also ROBOT backwards!" },

    { id:"bt36", kind:"type", type:"riddle", q:"Rearrange the letters of LISTEN to make a word that means \"quiet\".",
      hints:["Use all six letters.", "It starts with S."],
      answer:"SILENT", accept:["silent"],
      why:"LISTEN and SILENT use exactly the same letters." },

    { id:"bt37", kind:"type", type:"pattern", q:"What comes next? 2, 3, 5, 7, 11, 13, …",
      hints:["None of these can be divided evenly by anything except 1 and themselves.", "They're prime numbers.", "Check 14, 15, 16, 17…"],
      answer:"17", accept:["17", "seventeen"],
      why:"They're the prime numbers. The next one after 13 is 17." },

    { id:"bt38", kind:"type", type:"number", q:"A spider has 8 legs and a beetle has 6. A box holds 5 bugs with 34 legs in total. How many are spiders?",
      hints:["If all 5 were beetles, there'd be 30 legs.", "Each spider adds 2 extra legs.", "You need 4 extra legs."],
      answer:"2", accept:["2", "two"],
      why:"2 spiders (16 legs) and 3 beetles (18 legs) makes 34." },

    { id:"bt39", kind:"type", type:"logic", q:"Today is Saturday. What day will it be 100 days from now?",
      hints:["Every 7 days it's Saturday again.", "100 ÷ 7 is 14 weeks with some days left over.", "14 weeks is 98 days, so count 2 more days."],
      answer:"Monday", accept:["monday", "mon"],
      why:"98 days is exactly 14 weeks, landing on Saturday again. Two more days is Monday." },

    { id:"bt40", kind:"type", type:"riddle", q:"What word can go in front of BALL, FALL and FLAKE to make three new words?",
      hints:["Think winter.", "It's cold and white and it comes down from the sky."],
      answer:"SNOW", accept:["snow"],
      why:"Snowball, snowfall and snowflake." },
  ];

  // Code-lock puzzles (3 different digits). Each clue is [guess, rightPlace, wrongPlace].
  // Checked by brute force: exactly one code fits every clue.
  const LOCKS = [
    { code:"394", clues:[["407",0,1],["248",0,1],["592",1,0],["320",1,0],["857",0,0]] },
    { code:"705", clues:[["647",0,1],["572",0,2],["432",0,0],["875",1,1],["810",0,1]] },
    { code:"268", clues:[["096",0,1],["627",0,2],["734",0,0],["872",0,2],["601",0,1]] },
    { code:"517", clues:[["520",1,0],["308",0,0],["012",1,0],["607",1,0],["164",0,1]] },
  ];

  // Hands-on puzzle types (the game builds a fresh one each time)
  const HANDS = {
    lights: { name:"Lights Out", blurb:"Dad left every light in the garage on. Tap a light to flip it and its neighbours. Get them all off.",
      coach:"Hands-on puzzle: Lights Out. It's a grid of lights. Tapping a light flips it and the lights directly above, below, left and right of it. The goal is to turn every light off." },
    lock: { name:"Code Lock", blurb:"Crack the 3-digit code. Every digit is different. Read the clues, spin the dials, try your guess.",
      coach:"Hands-on puzzle: a 3-digit code lock with Mastermind-style clues (how many digits are right and in the right place, and how many are right but in the wrong place). All three digits are different." },
    river: { name:"River Run", blurb:"Get the puppy, the cat and the goldfish across the river. Dad's boat holds Dad plus one passenger.",
      coach:"Hands-on puzzle: a river crossing. Dad must ferry a puppy, a cat and a goldfish across. The boat holds Dad plus one passenger. The puppy can't be left alone with the cat, and the cat can't be left alone with the goldfish." },
    tiles: { name:"Slide Tiles", blurb:"Slide the tiles back into order, 1 to 8, with the gap at the bottom right.",
      coach:"Hands-on puzzle: an 8-tile sliding puzzle on a 3 by 3 grid. Slide tiles into the gap until they read 1 to 8 with the gap in the bottom-right corner." },
  };

  // Escape Dad's Garage: four rooms, three puzzles each, one code digit per room.
  const ESCAPE = {
    title: "Escape Dad's Garage",
    intro: "Kiddo? Bad news. I'm stuck in the garage. The door's jammed and the keypad wants a 4-digit code. Good news: I hid one digit in each corner of the garage, behind a puzzle. Bad news again: I don't remember the puzzles. Get me out before dinner?",
    code: "1985",
    rooms: [
      { name:"The Workbench", icon:"🔧", digit:"1",
        story:"Tools everywhere. Some of them are even mine. First, can someone switch these lights off? They're blinding me.",
        steps:[{ hands:"lights" }, { p:"bt14" }, { p:"bt35" }],
        done:"Under the hammer there's a sticky note with a big 1 on it. One digit down!" },
      { name:"The Toolbox", icon:"🧰", digit:"9",
        story:"It's locked. Who locks a toolbox? Me. I lock a toolbox.",
        steps:[{ p:"bt01" }, { hands:"lock" }, { p:"bt17" }],
        done:"Click! Inside, scratched on the lid: 9. Past-me was weirdly organised." },
      { name:"The Old Car", icon:"🚗", digit:"8",
        story:"My first car. Doesn't run, but the radio still works. I may have hidden something in the glovebox. Or a sandwich. Hopefully not a sandwich.",
        steps:[{ p:"bt09" }, { hands:"river" }, { p:"bt23" }],
        done:"Glovebox open. No sandwich, thank goodness. Just an old cassette labelled 8." },
      { name:"The Mystery Shelf", icon:"📦", digit:"5",
        story:"Christmas lights, a lava lamp, three broken skateboards and a box marked DO NOT OPEN. Let's open it.",
        steps:[{ p:"bt04" }, { p:"bt11" }, { hands:"tiles" }],
        done:"The DO NOT OPEN box had a single foam number in it: 5. Anticlimactic, but useful." },
    ],
    win: "1985! The year my first car rolled off the line. The door's rolling up… I'm free! Thanks, kiddo. Dinner's on me. Well, dinner's on Mum. But I'll set the table.",
    after: "Something fell off the top shelf as the door opened: a sticky note that says \"The cartridge is still lost.\" Hmm. Keep your eyes open.",
  };

  // ---------- Dev's Notebook (unlocked by the LEVEL code from Otto's Log; ten palindrome and word-flip puzzles) ----------
  const NB = [
    { id:"nb01", kind:"type", type:"riddle", q:"Dev's notebook starts with a name that reads the same forwards and backwards. It's what you call your mum. Three letters.",
      hints:["Say it out loud, then say it backwards.", "A name for the person who tucks you in.", "It starts and ends with M."],
      answer:"MOM", accept:["MOM", "MUM"], why:"MOM spelled backwards is still MOM. That's a palindrome." },

    { id:"nb02", kind:"type", type:"riddle", q:"Page two: a word for the middle of the day, and it's a palindrome. Four letters.",
      hints:["Think of the clock when both hands point straight up.", "Twelve o'clock.", "It starts with N and ends with N."],
      answer:"NOON", accept:["NOON"], why:"NOON backwards is NOON." },

    { id:"nb03", kind:"type", type:"riddle", q:"Word flip. Write STRESSED backwards. You'll get something sweet at the end of dinner.",
      hints:["Write the letters in reverse, starting from the last D.", "The last letters of STRESSED are S, E, D.", "It's plural, and Dev was always saving room for it."],
      answer:"DESSERTS", accept:["DESSERTS"], why:"STRESSED backwards is DESSERTS. Stressed is just desserts spelled the other way." },

    { id:"nb04", kind:"type", type:"riddle", q:"Word flip. Reverse the word LIVE to get the opposite of good.",
      hints:["Only four letters.", "Start with the E.", "A villain in a game is this."],
      answer:"EVIL", accept:["EVIL"], why:"LIVE backwards is EVIL." },

    { id:"nb05", kind:"type", type:"riddle", q:"Dev loved this sentence because it reads the same both ways, ignoring spaces: \"A man, a plan, a canal: ___.\" Which place finishes it?",
      hints:["The canal is a famous shortcut for ships.", "It joins the Atlantic and the Pacific.", "It's also a country in Central America. Seven letters."],
      answer:"Panama", accept:["PANAMA"], why:"\"A man, a plan, a canal: Panama\" is a famous palindrome sentence." },

    { id:"nb06", kind:"type", type:"number", q:"What's the smallest three-digit palindrome number that is also a multiple of 7?",
      hints:["Palindromes start 101, 111, 121, 131…", "Divide each by 7 and look for no remainder.", "It's in the 160s."],
      answer:"161", accept:["161"], why:"161 = 7 × 23, and it reads the same backwards. The ones before it (101, 111, 121, 131, 141, 151) aren't multiples of 7." },

    { id:"nb07", kind:"type", type:"riddle", q:"Word flip. Reverse the word REWARD to get a place where you keep your socks.",
      hints:["Write REWARD from the last letter to the first.", "It has a handle and slides open.", "It starts with DR."],
      answer:"DRAWER", accept:["DRAWER"], why:"REWARD backwards is DRAWER." },

    { id:"nb08", kind:"type", type:"riddle", q:"Dev drew a toy vehicle on the cover that is a palindrome and has seven letters. It goes fast around a track.",
      hints:["It has wheels, and it's a kind of competition.", "Think of a fast car on a track.", "RACE and CAR, joined together."],
      answer:"RACECAR", accept:["RACECAR", "RACECARS"], why:"RACECAR backwards is RACECAR." },

    { id:"nb09", kind:"type", type:"number", q:"Number flip. Take 47, flip its digits to get 74, then add the two together. What do you get?",
      hints:["47 + 74.", "Add the tens, then the ones.", "The answer is a palindrome too."],
      answer:"121", accept:["121"], why:"47 + 74 = 121, which reads the same backwards. Dev tried this with lots of numbers." },

    { id:"nb10", kind:"type", type:"riddle", q:"Dev's last page is written backwards: DRAWKCAB. Read it the right way round. What does it say?",
      hints:["Start from the last letter and go left.", "B, A, C, K…", "It's the word for the way Dev wrote the page."],
      answer:"BACKWARD", accept:["BACKWARD", "BACKWARDS"], why:"DRAWKCAB reversed is BACKWARD. Dev wrote the whole notebook with a flip in it." },
  ];

  window.BRAINTEASERS = { puzzles: P, notebook: NB, locks: LOCKS, hands: HANDS, escape: ESCAPE };

  // "Ask Dad" coach: the same chat machinery as the maths coach, one scene per puzzle.
  const KIND = { riddle:"Riddle", pattern:"Pattern", number:"Number trick", logic:"Logic puzzle" };
  const hint3 = ["Give me a hint, not the answer", "Give me a similar puzzle", "Here's what I'm stuck on: "];
  window.LESSONS = window.LESSONS || {};
  window.LESSONS.brain = {
    name: "Brain teasers", native: "Brain teasers", voice: "en-CA", hello: "Hi", coach: true,
    lessons: [],
    scenes: [
      ...[...P, ...NB].map(p => ({
        id: p.id, title: KIND[p.type] || "Puzzle", who: "Dad's your puzzle coach",
        open: `Brain teaser mode. The puzzle is: ${p.q} What have you tried so far? I'll give you hints, not the answer, so you get to crack it yourself.`,
        hints: hint3,
      })),
      ...Object.entries(HANDS).map(([k, h]) => ({
        id: "hands-" + k, title: h.name, who: "Dad's your puzzle coach",
        open: `Brain teaser mode. ${h.coach} What have you tried so far? I'll give you tips, not the full solution.`,
        hints: ["Give me a tip to get started", "What's a good strategy?", "Here's where I'm stuck: "],
      })),
    ],
  };
})();
