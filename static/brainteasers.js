/* RoboDad brain teasers: logic puzzles, riddles, number tricks and patterns.
   Every puzzle here is written by hand and its answer is checked, so the answer key
   is never made up on the fly. "ok" is the right answer and "no" are the wrong ones;
   the app shuffles them. Hints are revealed one at a time, and the answer and "why"
   are only shown once the child has picked an option or asked for the answer.
   The "Ask Dad" coach uses the AI, told to give hints first, never the answer. */
(function(){
  const P = [
    { id:"bt01", type:"logic", q:"A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
      hints:["Don't go with the first number that pops into your head.", "If the ball cost 10 cents, what would the bat cost, and what would the total be?", "Try 5 cents for the ball. Does the bat then cost exactly $1.00 more?"],
      ok:"$0.05", no:["$0.10", "$0.01", "$0.15"],
      why:"The bat is $1.05 and the ball is $0.05. Together that's $1.10, and the bat is exactly $1.00 more." },

    { id:"bt02", type:"riddle", q:"What has keys but can't open any locks?",
      hints:["You might find this in a music room.", "It has rows of black and white keys.", "It makes sound when you press the keys."],
      ok:"A piano", no:["A map", "A clock", "A door"],
      why:"A piano has keys you press, but they don't open anything." },

    { id:"bt03", type:"pattern", q:"A lily pad doubles in size every day. It covers the whole pond on day 48. On what day does it cover exactly half the pond?",
      hints:["Think about what happens the day before the whole pond is covered.", "If it doubles each day, the day before full coverage it must cover half.", "Count back one day from day 48."],
      ok:"Day 47", no:["Day 24", "Day 46", "Day 25"],
      why:"Doubling every day means the pond is half covered the day before it's fully covered: day 47." },

    { id:"bt04", type:"logic", q:"You are running a race and you overtake the person in second place. What place are you in now?",
      hints:["Be careful: you don't overtake the person in first place.", "Who did you pass, and where were they?", "Once you pass someone in second, you take their spot."],
      ok:"Second place", no:["First place", "Third place", "Last place"],
      why:"You passed the person in second, so you take second place. You didn't pass the leader." },

    { id:"bt05", type:"riddle", q:"Mary's father has five daughters: Nana, Nene, Nini, Nono, and ... What is the fifth daughter's name?",
      hints:["Read the question again slowly.", "The first four names all end in the same sound.", "The fifth daughter is someone the question has been about the whole time."],
      ok:"Mary", no:["Nunu", "Nana", "Nene"],
      why:"Mary's father has five daughters, and Mary is the fifth one." },

    { id:"bt06", type:"logic", q:"How many months of the year have 28 days?",
      hints:["Every month has at least 28 days.", "Check whether a month with 28 days is the only kind.", "February is the one everyone thinks of, but think about the others too."],
      ok:"All 12 months", no:["1 month", "2 months", "6 months"],
      why:"Every month has at least 28 days, so all 12 do." },

    { id:"bt07", type:"riddle", q:"A farmer has 17 sheep. All but 9 run away. How many sheep are left?",
      hints:["Read the phrase 'all but 9' carefully.", "'All but 9' means every sheep except 9 ran away.", "So how many stayed?"],
      ok:"9 sheep", no:["8 sheep", "17 sheep", "0 sheep"],
      why:"All but 9 ran away, so 9 stayed behind." },

    { id:"bt08", type:"logic", q:"Which weighs more: a kilogram of feathers or a kilogram of bricks?",
      hints:["Look at the weight number on each one.", "Both are labelled one kilogram.", "The material doesn't change the weight."],
      ok:"They weigh the same", no:["The feathers", "The bricks"],
      why:"A kilogram is a kilogram. Both weigh exactly one kilogram, even though they look and feel different." },

    { id:"bt09", type:"logic", q:"You have 3 apples and you take away 2 of them. How many apples do you have?",
      hints:["Think about who has the apples: you or the place you took them from.", "Which apples did you take?", "How many did you take?"],
      ok:"2 apples", no:["1 apple", "3 apples", "0 apples"],
      why:"You took 2 apples, so you have 2 of them." },

    { id:"bt10", type:"pattern", q:"What comes next in this pattern? 2, 6, 12, 20, 30, ...",
      hints:["Look at the gap between each pair of numbers.", "The gaps are 4, 6, 8, 10. What's the next gap?", "Add that gap to 30."],
      ok:"42", no:["40", "44", "36"],
      why:"The gaps go up by 2 each time: 4, 6, 8, 10, 12. Adding 12 to 30 gives 42." },

    { id:"bt11", type:"pattern", q:"What comes next? 1, 1, 2, 3, 5, 8, ...",
      hints:["Add the two numbers before the gap.", "What is 3 plus 5?", "Each number is the sum of the two before it."],
      ok:"13", no:["11", "12", "15"],
      why:"Each number is the sum of the two before it: 5 + 8 = 13." },

    { id:"bt12", type:"pattern", q:"What comes next? 3, 6, 12, 24, ...",
      hints:["Is each number the same as the one before, plus something, or times something?", "Compare 3 and 6. What did you multiply by?", "Multiply 24 by the same number."],
      ok:"48", no:["36", "42", "30"],
      why:"Each number is double the one before it: 24 x 2 = 48." },

    { id:"bt13", type:"number", q:"Think of a number. Double it, then add 6, and you get 20. What was your number?",
      hints:["Work backwards. What was the number before you added 6?", "20 take away 6 is what?", "Now halve that number to find the starting number."],
      ok:"7", no:["5", "9", "14"],
      why:"20 minus 6 is 14. Half of 14 is 7, and 7 doubled is 14, plus 6 is 20." },

    { id:"bt14", type:"number", q:"What is 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10?",
      hints:["Pair the numbers up: 1 with 10, 2 with 9, and so on.", "How many pairs make 11 each?", "Five pairs of 11 is what?"],
      ok:"55", no:["45", "50", "60"],
      why:"Five pairs of 11 (1+10, 2+9, 3+8, 4+7, 5+6) make 55." },

    { id:"bt15", type:"number", q:"A cube has 6 faces. How many edges does it have?",
      hints:["An edge is where two faces meet.", "Picture the top of the cube: it has 4 edges.", "The bottom has 4 edges too, and there are 4 vertical edges joining them."],
      ok:"12", no:["8", "6", "10"],
      why:"4 edges on top, 4 on the bottom, and 4 joining them: 12 in total." },

    { id:"bt16", type:"logic", q:"Anna is taller than Ben. Ben is taller than Cara. Who is the shortest?",
      hints:["Write the order down from tallest to shortest.", "Anna is first, then Ben.", "Who comes after Ben?"],
      ok:"Cara", no:["Anna", "Ben"],
      why:"The order from tallest to shortest is Anna, Ben, then Cara." },

    { id:"bt17", type:"logic", q:"All roses are flowers. Some flowers fade quickly. Does it follow that some roses fade quickly?",
      hints:["Ask whether every flower that fades quickly must be a rose.", "The roses might all be among the flowers that don't fade quickly.", "Only say yes if the facts force it."],
      ok:"Can't tell from these facts", no:["Yes", "No, no roses fade quickly"],
      why:"The 'some flowers' that fade quickly might not include any roses, so the facts don't prove it either way." },

    { id:"bt18", type:"riddle", q:"What gets wetter the more it dries?",
      hints:["Think about what you use after a shower.", "It's something that soaks up water.", "It's used to dry yourself."],
      ok:"A towel", no:["A sponge", "A cloud"],
      why:"A towel soaks up water when you dry yourself with it, so it gets wetter as it dries you." },

    { id:"bt19", type:"riddle", q:"I have cities, but no houses. I have forests, but no trees. I have water, but no fish. What am I?",
      hints:["You can carry me around, and you might use me to find places.", "Cities and forests can be shown on me, but they aren't really there.", "I'm a flat picture of places."],
      ok:"A map", no:["A globe", "A book"],
      why:"A map shows cities, forests and water, but none of them are actually inside it." },

    { id:"bt20", type:"riddle", q:"The more of me you take, the more you leave behind. What am I?",
      hints:["Think about what you leave on the ground as you walk.", "It's something you make every time you move.", "Each step leaves one behind."],
      ok:"Footsteps", no:["Time", "Money"],
      why:"Every step you take leaves another footprint behind you." },

    { id:"bt21", type:"riddle", q:"What has a neck but no head?",
      hints:["Think about things you pour from.", "It has a long neck with an opening at the top.", "It usually holds liquid like milk or juice."],
      ok:"A bottle", no:["A guitar", "A shirt", "A giraffe"],
      why:"A bottle has a neck, but no head. A guitar has a head at the top of its neck." },

    { id:"bt22", type:"riddle", q:"What can travel around the world while staying in a corner?",
      hints:["Think about the post.", "It sticks onto envelopes.", "It goes to lots of places without moving itself."],
      ok:"A stamp", no:["A cat", "The wind"],
      why:"A stamp sticks in the corner of an envelope while the letter travels around the world." },

    { id:"bt23", type:"riddle", q:"What goes up but never comes down?",
      hints:["Think about something that only ever increases.", "Every birthday, this goes up by one.", "It's something you can't stop."],
      ok:"Your age", no:["A balloon", "Smoke"],
      why:"Your age only ever goes up. Balloons and smoke come back down." },

    { id:"bt24", type:"riddle", q:"What has to be broken before you can use it?",
      hints:["Think about breakfast.", "Something you crack open on a pan.", "You crack its shell to get what's inside."],
      ok:"An egg", no:["A lock", "A promise"],
      why:"You have to crack an egg open before you can cook with it." },

    { id:"bt25", type:"logic", q:"A man looks at a photo and says: 'I have no brothers or sisters, but that man's father is my father's son.' Who is in the photo?",
      hints:["'My father's son' means someone who is the speaker's brother or himself.", "The speaker has no brothers, so the father's son must be the speaker himself.", "So the man's father is the speaker. Then who is the man in the photo?"],
      ok:"The speaker's son", no:["The speaker's brother", "The speaker's father", "The speaker"],
      why:"The man's father is the speaker, so the man in the photo is the speaker's son." },

    { id:"bt26", type:"logic", q:"You have nine identical balls. One is slightly heavier than the rest. Using a balance scale, what is the fewest number of weighings you need to find the heavy ball?",
      hints:["Split the balls into three groups of three.", "Weigh two of the groups against each other.", "After the first weighing, you only have three balls left to deal with."],
      ok:"2 weighings", no:["1 weighing", "3 weighings", "4 weighings"],
      why:"First weigh 3 against 3 to find the group with the heavy ball. Then weigh 2 of its 3 balls against each other to find the heavy one." },

    { id:"bt27", type:"logic", q:"If the day before yesterday was Monday, what day is tomorrow?",
      hints:["Yesterday came after Monday. What day was that?", "Work out what today is first.", "Then add one day to find tomorrow."],
      ok:"Thursday", no:["Wednesday", "Friday"],
      why:"Monday was the day before yesterday, so yesterday was Tuesday, today is Wednesday, and tomorrow is Thursday." },

    { id:"bt28", type:"number", q:"What is the next prime number after 7?",
      hints:["A prime number can only be divided evenly by 1 and itself.", "Check 8: it's divisible by 2.", "Check 9: it's divisible by 3. Then check 10 and 11."],
      ok:"11", no:["9", "8", "13"],
      why:"8, 9 and 10 can all be divided evenly by numbers other than 1 and themselves. 11 can't, so it's the next prime." },

    { id:"bt29", type:"pattern", q:"Which one doesn't belong? 9, 16, 25, 30",
      hints:["Some of these are square numbers.", "Square numbers multiply a whole number by itself: 3 x 3 = 9.", "Check each number: which isn't a square?"],
      ok:"30", no:["9", "16", "25"],
      why:"9, 16 and 25 are square numbers (3x3, 4x4, 5x5). 30 isn't." },

    { id:"bt30", type:"logic", q:"Three switches downstairs control one light bulb upstairs. You can flip the switches as much as you like, but you can only go upstairs once. How can you work out which switch controls the bulb?",
      hints:["Use heat as well as light.", "Turn one switch on for a few minutes, then turn it off.", "Turn a second switch on, go upstairs, and feel the bulb."],
      ok:"Warm but off means the first switch; lit means the second; cold and off means the third", no:["Turn them all on and look upstairs", "Flip each one and go upstairs three times"],
      why:"Turn switch 1 on for a few minutes, then off. Turn switch 2 on, go up. If the bulb is on, it's switch 2. If it's off but warm, it's switch 1. If it's off and cold, it's switch 3." }
  ];

  window.BRAINTEASERS = { puzzles: P };

  // "Ask Dad" coach: the same chat machinery as the maths coach, one scene per puzzle.
  const KIND = { riddle:"Riddle", pattern:"Pattern", number:"Number trick", logic:"Logic puzzle" };
  window.LESSONS = window.LESSONS || {};
  window.LESSONS.brain = {
    name: "Brain teasers", native: "Brain teasers", voice: "en-CA", hello: "Hi", coach: true,
    lessons: [],
    scenes: P.map(p => ({
      id: p.id, title: KIND[p.type] || "Puzzle", who: "Dad's your puzzle coach",
      open: `Brain teaser mode. The puzzle is: ${p.q} What have you tried so far? I'll give you hints, not the answer, so you get to crack it yourself.`,
      hints: ["Give me a hint, not the answer", "Give me a similar puzzle", "Here's what I'm stuck on: "],
    })),
  };
})();
