export const images = [
  {
    id: 'bench_10_t1', 
    name: "Brown Tent Color",
    description: "Bench 10 reps 10 pounds after 3 sets(don't forget the the bar!)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Tent.Br.png'), 
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/TentColor.png'),
    tab:  'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Bench',
        metric: 'minimumWeightForReps',
        minReps: 10,
        minSets: 3,
        target: 10
      }
    ]
  },
    reward: {
      id: 'Tent_Br'
    }  
  },
//new item 2
  {
    id: 'bench_23_t2', 
    name: "Pink Waves(Pattern)",
    description: "Bench 23 pounds(don't forget the the bar!)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Pi.Waves.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Bench',
        metric: 'minimumWeightForReps',
        minReps: 10,
        minSets: 3,
        target: 23
      }
    ]
  },
    reward: {
      id: 'Pi_Waves'
    }  
  },
//new item 3
  {
    id: 'bench_45_t3', 
    name: "Bucket Hat",
    description: "Bench 45 pounds(don't forget the the bar!)",
    image: require('../assets/AppAssets/Unlocks/Reveals/BucketHat.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/BucketHat.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Bench',
        metric: 'minimumWeightForReps',
        minReps: 10,
        minSets: 3,
        target: 45
      }
    ]
  },
    reward: {
      id: 'BucketHat'
    }  
  },
//new item 4
  {
    id: 'inclineBench_10_t1', 
    name: "Yellow Waves(Pattern)",
    description: "Incline Bench 10 pounds(don't forget the the bar!)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Y.Waves.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Incline Bench',
        target: 10,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Y_Waves'
    }  
  },
  //new item 5
  {
    id: 'inclineBench_23_t1', 
    name: "Blue Tent Color",
    description: "Incline Bench 23 pounds(don't forget the the bar!)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Tent.B.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/TentColor.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Incline Bench',
        target: 23,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Tent_B'
    }  
  },
//new item 6
  {
    id: 'inclineBench_45_t1', 
    name: "Orange Stripes(Pattern)",
    description: "Incline Bench 45 pounds(don't forget the the bar!)",
    image: require('../assets/AppAssets/Unlocks/Reveals/O.Stripes.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Incline Bench',
        target: 45,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'O_Stripes'
    }  
  },
//new item 7
  {
    id: 'bcurls_10_t1', 
    name: "Green Stripes (Pattern)",
    description: "Curl 10 pounds(if with bar add 20)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Gr.Stripes.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Bicep Curls',
        target: 10,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Gr_Stripes'
    }  
  },
//new item 8
  {
    id: 'bcurls_15_t2', 
    name: "Cherry Blossoms",
    description: "Curl 15 pounds(if with bar add 20)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Cherry.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Seasons.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Bicep Curls',
        target: 15,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Cherry'
    }  
  },
//new item 9
  {
    id: 'bcurls_25_t3', 
    name: "Red Stars(Pattern)",
    description: "Curl 25 pounds(if with bar add 20)",
    image: require('../assets/AppAssets/Unlocks/Reveals/R.Stars.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Bicep Curls',
        target: 25,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'R_Stars'
    }  
  },
  //new item 10
  {
    id: 'shoulderpress_10_t1', 
    name: "Blue Flowers(Patterns)",
    description: "Shoulder Press 10 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/B.Flowers.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Shoulder Press',
        target: 10,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'B_Flowers'
    }
  },
  //new item 11
  {
    id: 'shoulderpress_15_t2', 
    name: "White Dots(Patterns)",
    description: "Shoulder Press 15 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/W.Stripes.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Shoulder Press',
        target: 15,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'W_Stripes'
    }  
  },
  //new item 12
  {
    id: 'shoulderpress_25_t3', 
    name: "Purple Hearts(Patterns)",
    description: "Shoulder Press 25 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/P.Hearts.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Shoulder Press',
        target: 25,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'P_Hearts'
    }  
  },
  //new item 13
  {
    id: 'lateralraises_5_t1', 
    name: "Blue Dots(Patterns)",
    description: "Lateral Raise 5 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/B.Dots.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Lateral Raises',
        target: 5,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'B_Dots'
    }  
  },
  //new item 14
  {
    id: 'lateralraises_10_t3', 
    name: "Brown Hearts Pattern",
    description: "Lateral Raise 10 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Br.Hearts.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Lateral Raises',
        target: 10,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Br_Hearts'
    }  
  },
  //new item 15
  {
    id: 'lateralraises_20_t3', 
    name: "Green Dots(Patterns)",
    description: "Lateral Raise 20 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/G.Dots.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Lateral Raises',
        target: 20,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'G_Dots'
    }  
  },
  //new item 27
  {
    id: 'cablerows_25_t1', 
    name: "Black Dots(Patterns)",
    description: "Cable Rows 25 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Bl.Dots.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Cable Rows',
        target: 25,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Bl_Dots'
    }  
  },
  //new item 28
  {
    id: 'cablerows_50_t2', 
    name: "Gray Tent Color",
    description: "Cable Rows 50 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Tent.Gr.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/TentColor.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Cable Rows',
        target: 50,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Tent_Gr'
    }  
  },
  //new item 29
  {
    id: 'cablerows_75_t3', 
    name: "Duck Hat",
    description: "Cable Rows 75 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Duck.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Duck.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Cable Rows',
        target: 75,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Duck'
    }  
  },
  //new item 30
  {
    id: 'lappulldown_25_t1', 
    name: "Brown Wave(Pattern)",
    description: "Lap Pull-Down 25 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Br.Waves.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Lap Pull-Downs',
        target: 25,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Br_Waves'
    }  
  },
  //new item 31
  {
    id: 'lappulldown_50_t2', 
    name: "Cloudy and Sunny Sky",
    description: "Lap Pull-Down 50 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Cloudy.Sunny.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Skies.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Lap Pull-Downs',
        target: 50,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Cloudy_Sunny'
    }  
  },
  //new item 32
  {
    id: 'lappulldown_75_t3', 
    name: "Party",
    description: "Lap Pull-Down 75 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Party.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Party.png'),
    tab: 'Weightlifting',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Lap Pull-Downs',
        target: 75,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Party'
    }  
  },

  //Start of Lowerbody Weightlifting
  //new item 16
  {
    id: 'squats_10_t1', 
    name: "Purple Waves(Patterns)",
    description: "Squat 10 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/P.Waves.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Squats',
        target: 10,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'P_Waves'
    }  
  },
  //new item 17
  {
    id: 'squats_25_t2', 
    name: "Gray Stripes(Patterns)",
    description: "Squat 25 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Gr.Stripes.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Squats',
        target: 25,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Gr_Stripes'
    }  
  },
  //new item 18
  {
    id: 'squats_45_t3', 
    name: "Leaf hat",
    description: "Squat 45 Pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Leaf.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Leaf.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Squats',
        target: 45,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Leaf'
    }  
  },
  //new item 19
  {
    id: 'legcurls_10_t1', 
    name: "Purple Stripes(pattern)",
    description: "Leg Curl 10 pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/P.Stripes.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Leg Curls',
        target: 10,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'P_Stripes'
    }  
  },
  //new item 20
  {
    id: 'legcurls_25_t2', 
    name: "Pink Tent Color",
    description: "Leg Curl 25 pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Tent.Pi.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/TentColor.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Leg Curls',
        target: 25,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Tent_Pi'
    }  
  },
  //new item 21
  {
    id: 'legcurls_45_t3', 
    name: "Orange Flowers(pattern)",
    description: "Leg Curl 45 pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/O.Flowers.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Leg Curls',
        target: 45,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'O_Flowers'
    }  
  },
  //new item 22
  {
    id: 'legpress_45_t1', 
    name: "Pink Flowers(pattern)",
    description: "Leg Press 45 pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/Pi.Flowers.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Leg Press',
        target: 45,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Pi_Flowers'
    }  
  },
  //new item 23
  {
    id: 'legpress_90_t2', 
    name: "Blue Wave(pattern)",
    description: "Leg Press 90 pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/B.Waves.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Leg Press',
        target: 90,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'B_Waves'
    }  
  },
  //new item 24
  {
    id: 'legpress_135_t3', 
    name: "Red Dots(pattern)",
    description: "Leg Press 135 pounds",
    image: require('../assets/AppAssets/Unlocks/Reveals/R.Dots.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Leg Press',
        target: 135,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'R_Dots'
    }  
  },
  //new item 25
  {
    id: 'deadlift_10_t1', 
    name: "Blue Stripes(Pattern)",
    description: "Deadlift 10 pounds(including bar)",
    image: require('../assets/AppAssets/Unlocks/Reveals/B.Stripes.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Deadlift',
        target: 10,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'B_Stripes'
    }  
  },
  //new item 26
  {
    id: 'deadlift_25_t2', 
    name: "Sunset Sky",
    description: "Deadlift 25 pounds(including bar)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Sunset.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Skies.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Deadlift',
        target: 25,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Sunset'
    }  
  },
  //new item 26
  {
    id: 'deadlift_45_t3', 
    name: "Pink Hearts(Pattern)",
    description: "Deadlift 45 pounds(including bar)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Pi.Hearts.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Weightlifting',
    subTab: 'Lower',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Deadlift',
        target: 45,
        metric: 'minimumWeightForReps'
      }
    ]
  },
    reward: {
      id: 'Pi_Hearts'
    }  
  },

//Calisthenics
//Upperbody

  //new item 33
  {
    id: 'pushups_5_t1', 
    name: "Gray Flowers(Pattern)",
    description: "Do a minimum 5 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Gr.Flowers.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Push-ups',
        metric: 'minimumReps',
        minSets: 3,
        target: 5
      }
    ]
  },
    reward: {
      id: 'Gr_Flowers'
    }  
  },
    //new item 34
  {
    id: 'pushups_15_t2', 
    name: "Autumn",
    description: "Do a minimum 25 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Autumn.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Skies.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Push-ups',
        metric: 'minimumReps',
        minSets: 3,
        target: 15
      }
    ]
  },
    reward: {
      id: 'Autumn'
    }  
  },
    //new item 35
  {
    id: 'pushups_25_t3', 
    name: "CatEars",
    description: "Do a minimum 25 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/CatEars.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/CatEars.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Push-ups',
        metric: 'minimumReps',
        minSets: 3,
        target: 25
      }
    ]
  },
    reward: {
      id: 'CatEars'
    }  
  },
  //new item 36
  {
    id: 'inclinepushups_5_t1', 
    name: "White Flowers(Pattern)",
    description: "Do a minimum 5 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/W.Flowers.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Incline Push-ups',
        metric: 'minimumReps',
        minSets: 3,
        target: 5
      }
    ]
  },
    reward: {
      id: 'W_Flowers'
    }  
  },
  //new item 37
  {
    id: 'inclinepushups_15_t2', 
    name: "Orange Tent Color",
    description: "Do a minimum 15 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Tent.O.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/TentColor.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Incline Push-ups',
        metric: 'minimumReps',
        minSets: 3,
        target: 15
      }
    ]
  },
    reward: {
      id: 'Tent_O'
    }  
  },
  //new item 38
  {
    id: 'inclinepushups_25_t3', 
    name: "Beret Hat",
    description: "Do a minimum 25 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Beret.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Beret.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Incline Push-ups',
        metric: 'minimumReps',
        minSets: 3,
        target: 25
      }
    ]
  },
    reward: {
      id: 'Beret'
    }  
  },
  //new item 39
  {
    id: 'dips_10_t1', 
    name: "Green Waves(Pattern)",
    description: "Do a minimum 10 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/G.Waves.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Dips',
        metric: 'minimumReps',
        minSets: 3,
        target: 10
      }
    ]
  },
    reward: {
      id: 'G_Waves'
    }  
  },
  //new item 40
  {
    id: 'dips_20_t2', 
    name: "Blue Stars(Pattern)",
    description: "Do a minimum 20 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/B.Stars.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Dips',
        metric: 'minimumReps',
        minSets: 3,
        target: 20
      }
    ]
  },
    reward: {
      id: 'B_Stars'
    }  
  },
  //new item 41
  {
    id: 'dips_25_t3', 
    name: "Yellow Flowers(Pattern)",
    description: "Do a minimum 25 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Y.Flowers.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Dips',
        metric: 'minimumReps',
        minSets: 3,
        target: 25
      }
    ]
  },
    reward: {
      id: 'Y_Flowers'
    }  
  },
  //new item 42
  {
    id: 'pullups_5_t1', 
    name: "Blue Hearts(Pattern)",
    description: "Do a minimum of 5 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/B.Hearts.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Pull-ups',
        metric: 'minimumReps',
        minSets: 3,
        target: 5
      }
    ]
  },
    reward: {
      id: 'B_Hearts'
    }  
  },
  //new item 43
  {
    id: 'pullups_10_t2', 
    name: "Top Hat",
    description: "Do a minimum of 10 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/TopHat.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/TopHat.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Pull-ups',
        metric: 'minimumReps',
        minSets: 3,
        target: 10
      }
    ]
  },
    reward: {
      id: 'Top Hat'
    }  
  },
  //new item 44
  {
    id: 'pullups_20_t2', 
    name: "Black Stripes(Pattern)",
    description: "Do a minimum of 20 reps in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Bl.Stripes.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Upper',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Pull-ups',
        metric: 'minimumReps',
        minSets: 3,
        target: 10
      }
    ]
  },
    reward: {
      id: 'Bl_Stripes'
    }  
  },

  //LOWERBODY CALISTHENICS
  //new item 45
  {
    id: 'lunges_15_t1', 
    name: "Gray Wave(Pattern)",
    description: "Do a minimum of 15 Lunges in 3 or more sets(Each leg)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Gr.Waves.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Lower',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Lunges',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 15
      }
    ]
  },
    reward: {
      id: 'Gr_Waves'
    }  
  },
  //new item 46
  {
    id: 'lunges_30_t2', 
    name: "Blue Flowers(Pattern)",
    description: "Do a minimum of 30 Lunges in 3 or more sets(Each leg)",
    image: require('../assets/AppAssets/Unlocks/Reveals/B.Flowers.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Lower',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Lunges',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 30
      }
    ]
  },
    reward: {
      id: 'B_Flowers'
    }  
  },
  //new item 47
  {
    id: 'lunges_50_t3', 
    name: "White Stars(Pattern)",
    description: "Do a minimum of 50 Lunges in 3 or more sets(Each leg)",
    image: require('../assets/AppAssets/Unlocks/Reveals/W.Stars.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Lower',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Lunges',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 50
      }
    ]
  },
    reward: {
      id: 'W_Stars'
    }  
  },
  //new item 49
  {
    id: 'calfraises_15_t1', 
    name: "We need a reward for this one",
    description: "Do a minimum of 15 Calf Raises in 3 or more sets(Each leg)",
    image: require('../assets/AppAssets/Unlocks/Reveals/W.Stars.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Lower',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Calfraises',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 15
      }
    ]
  },
    reward: {
      id: 'W_Stars'
    }  
  },
 //new item 50
  {
    id: 'calfraises_30_t2', 
    name: "We need a reward for this one",
    description: "Do a minimum of 15 Calf Raises in 3 or more sets(Each leg)",
    image: require('../assets/AppAssets/Unlocks/Reveals/W.Stars.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Lower',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Calfraises',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 15
      }
    ]
  },
    reward: {
      id: 'W_Stars'
    }  
  },
//new item 51
  {
    id: 'calfraises_50_t3', 
    name: "EggHat",
    description: "Do a minimum of 50 Calf Raises in 3 or more sets(Each leg)",
    image: require('../assets/AppAssets/Unlocks/Reveals/Egg.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Egg.png'),
    tab: 'Calisthenics',
    subTab: 'Lower',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Wall sit',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 50
      }
    ]
  },
    reward: {
      id: 'Egg'
    }  
  },
//new item 52
  {
    id: 'wallsits_30_t1', 
    name: "White Heart(Pattern)",
    description: "Sit a minimum of 30 seconds against a wall in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/W.Hearts.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Lower',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Wall sit',
        metric: 'minimumValue',
        minSets: 3,
        field: 'seconds',
        target: 30
      }
    ]
  },
    reward: {
      id: 'W_Hearts'
    }  
  },
//new item 53
  {
    id: 'wallsits_60_t2', 
    name: "Black Heart(Pattern)",
    description: "Sit a minimum of 1min against a wall in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Bl.Hearts.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Lower',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Wall sit',
        metric: 'minimumValue',
        minSets: 3,
        field: 'seconds',
        target: 60
      }
    ]
  },
    reward: {
      id: 'Bl_Hearts'
    }  
  },
//new item 54
  {
    id: 'wallsits_150_t3', 
    name: "Brown Dots(Pattern)",
    description: "Sit a minimum of 2min and 30 secs against a wall in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Br.Dots.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Calisthenics',
    subTab: 'Lower',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Wall sit',
        metric: 'minimumValue',
        minSets: 3,
        field: 'seconds',
        target: 150
      }
    ]
  },
    reward: {
      id: 'Br_Dots'
    }  
  },

  // CORE/AB Exercises
//new item 55
  {
    id: 'situps_20_t1', 
    name: "Purple Tent Color",
    description: "Do a minimum of 20 Sit-ups in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Tent.P.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/TentColor.png'),
    tab: 'Core',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Sit-ups',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 20
      }
    ]
  },
    reward: {
      id: 'Tent_P'
    }  
  },
//new item 56
  {
    id: 'situps_35_t2', 
    name: "Yellow Stars(Pattern)",
    description: "Do a minimum of 35 Sit-ups in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Y.Stars.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Core',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Sit-ups',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 35
      }
    ]
  },
    reward: {
      id: 'Y_Stars'
    }  
  },
//new item 57
  {
    id: 'situps_50_t3', 
    name: "Headphones Hat",
    description: "Do a minimum of 50 Sit-ups in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Headphones.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Headphones.png'),
    tab: 'Core',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Sit-ups',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 50
      }
    ]
  },
    reward: {
      id: 'Headphones'
    }  
  },
//new item 59
  {
    id: 'crunches_20_t1', 
    name: "No Reward",
    description: "Do a minimum of 20 Crunches in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Headphones.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Headphones.png'),
    tab: 'Core',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Crunches',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 20
      }
    ]
  },
    reward: {
      id: 'Headphones'
    }  
  },
//new item 59
  {
    id: 'crunches_35_t2', 
    name: "Purple Flowers(Pattern)",
    description: "Do a minimum of 35 Crunches in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/P.Flowers.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Core',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Crunches',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 35
      }
    ]
  },
    reward: {
      id: 'P_Flowers'
    }  
  },
//new item 60
  {
    id: 'crunches_50_t3', 
    name: "Green Tent Color",
    description: "Do a minimum of 50 Crunches in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Tent.G.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/TentColor.png'),
    tab: 'Core',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Crunches',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 50
      }
    ]
  },
    reward: {
      id: 'Tent_G'
    }  
  },
//new item 61
  {
    id: 'plank_30_t1', 
    name: "Red Flowers(Pattern)",
    description: "Hold a Plank position for a minimum of 30 secs in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/R.Flowers.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Core',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Plank',
        metric: 'minimumValue',
        minSets: 3,
        field: 'seconds',
        target: 30
      }
    ]
  },
    reward: {
      id: 'R_Flowers'
    }  
  },
//new item 62
  {
    id: 'plank_60_t2', 
    name: "Green Hearts(Pattern)",
    description: "Hold a Plank position for a minimum of 1min in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/G.Hearts.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Core',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Plank',
        metric: 'minimumValue',
        minSets: 3,
        field: 'seconds',
        target: 60
      }
    ]
  },
    reward: {
      id: 'G_Hearts'
    }  
  },
//new item 63
  {
    id: 'plank_150_t3', 
    name: "Propeller Hat",
    description: "Hold a Plank position for a minimum of 2min and 30s in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Propeller.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Propeller.png'),
    tab: 'Core',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Plank',
        metric: 'minimumValue',
        minSets: 3,
        field: 'seconds',
        target: 150
      }
    ]
  },
    reward: {
      id: 'Propeller'
    }  
  },
//new item 64
  {
    id: '6inleghold_60_t1', 
    name: "Orange Stars(Pattern)",
    description: "Hold an upward 6 inch leg position for a minimum of 60s in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/O.Stars.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Core',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: '6in Leg Hold',
        metric: 'minimumValue',
        minSets: 3,
        field: 'seconds',
        target: 60
      }
    ]
  },
    reward: {
      id: 'O_Stars'
    }  
  },
//new item 65
  {
    id: '6inleghold_120_t2', 
    name: "Orange Stars(Pattern)",
    description: "Hold an upward 6 inch leg position for a minimum of 2min in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Gr.Dots.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Core',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: '6in Leg Hold',
        metric: 'minimumValue',
        minSets: 3,
        field: 'seconds',
        target: 120
      }
    ]
  },
    reward: {
      id: 'Gr_Dots'
    }  
  },
//new item 66
  {
    id: '6inleghold_180_t3', 
    name: "Winter Season",
    description: "Hold an upward 6 inch leg position for a minimum of 3min in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Winter.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Seasons.png'),
    tab: 'Core',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: '6in Leg Hold',
        metric: 'minimumValue',
        minSets: 3,
        field: 'seconds',
        target: 180
      }
    ]
  },
    reward: {
      id: 'Winter'
    }  
  },
//new item 67
  {
    id: 'legraises_10_t1', 
    name: "Yellow Hearts(Pattern)",
    description: "Do a minimum of 10 Leg Raises in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/Y.Hearts.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Core',
    tier: 'Tier 1',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Leg Raises',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 10
      }
    ]
  },
    reward: {
      id: 'Y_Hearts'
    }  
  },
//new item 68
  {
    id: 'legraises_20_t2', 
    name: "Red Stripes(Pattern)",
    description: "Do a minimum of 20 Leg Raises in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/R.Stripes.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Core',
    tier: 'Tier 2',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Leg Raises',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 20
      }
    ]
  },
    reward: {
      id: 'R_Stripes'
    }  
  },
//new item 69
  {
    id: 'legraises_30_t3', 
    name: "Blue Waves(Pattern)",
    description: "Do a minimum of 30 Leg Raises in 3 or more sets",
    image: require('../assets/AppAssets/Unlocks/Reveals/B.Waves.png'),
    hidden: require('../assets/AppAssets/Unlocks/Silhouettes/Patterns.png'),
    tab: 'Core',
    tier: 'Tier 3',
    logic: 'AND',
    requirements: {
      rules: [
      {
        type: 'exercise',
        exercise: 'Leg Raises',
        metric: 'minimumValue',
        minSets: 3,
        field: 'reps',
        target: 30
      }
    ]
  },
    reward: {
      id: 'B_Waves'
    }  
  },

]