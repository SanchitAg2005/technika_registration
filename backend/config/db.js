const mongoose = require('mongoose');

let mongoServer = null;

const initialEvents = [
  // --- Technical Events (20) ---
  { eventId: 'TECH_CB', name: 'Code Buster', category: 'Technical', description: 'Cracking codes and debugging syntax errors.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 2, displayOrder: 1 },
  { eventId: 'TECH_RT', name: 'Red Tech', category: 'Technical', description: 'Tech challenges and infrastructure layout planning.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 4, displayOrder: 2 },
  { eventId: 'TECH_RW', name: 'Robo Wars', category: 'Technical', description: 'Combat robotics tournament in the arena.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 4, displayOrder: 3 },
  { eventId: 'TECH_RR', name: 'Robo Race', category: 'Technical', description: 'Race your custom built robot on the obstacle track.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 3, displayOrder: 4 },
  { eventId: 'TECH_RP', name: 'Robo Pick & Place', category: 'Technical', description: 'Robots sorting and placing cubes dynamically.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 4, displayOrder: 5 },
  { eventId: 'TECH_IQ', name: 'IntelliQuest', category: 'Technical', description: 'Multi-stage quiz focusing on AI, CS, and technology.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 4, displayOrder: 6 },
  { eventId: 'TECH_BS', name: 'BrainStorm Battle', category: 'Technical', description: 'Case study analysis and technology problem solving.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 7 },
  { eventId: 'TECH_CC', name: 'Circuit Crafter', category: 'Technical', description: 'Design and assemble electrical and logic circuits.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 3, displayOrder: 8 },
  { eventId: 'TECH_EC', name: 'Electrofix Challenge', category: 'Technical', description: 'Troubleshoot and fix hardware and component failures.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 3, displayOrder: 9 },
  { eventId: 'TECH_JW', name: 'Junkyard Wars', category: 'Technical', description: 'Assemble working models out of scrap materials.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 4, displayOrder: 10 },
  { eventId: 'TECH_AQ', name: 'AI Quizathon', category: 'Technical', description: 'Competitive quiz covering Artificial Intelligence history and models.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 4, displayOrder: 11 },
  { eventId: 'TECH_EA', name: 'EcoAI Challenge', category: 'Technical', description: 'Propose AI models to address environmental issues.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 4, displayOrder: 12 },
  { eventId: 'TECH_PM', name: 'Project Model Exhibition', category: 'Technical', description: 'Showcase working projects or software ideas.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 4, displayOrder: 13 },
  { eventId: 'TECH_CL', name: 'Coding Ladder', category: 'Technical', description: 'Fast-paced algorithmic challenge with increasing difficulty.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 14 },
  { eventId: 'TECH_WW', name: 'Web Wizard', category: 'Technical', description: 'Design and build dynamic web pages.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 2, displayOrder: 15 },
  { eventId: 'TECH_CS', name: 'Cyber Shield', category: 'Technical', description: 'Capture the flag security and cryptography challenge.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 2, displayOrder: 16 },
  { eventId: 'TECH_AA', name: 'App Attack', category: 'Technical', description: 'Rapid app mockups and design pitches.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 4, displayOrder: 17 },
  { eventId: 'TECH_DD', name: 'Data Dash', category: 'Technical', description: 'Analyze datasets and draw meaningful insights.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 3, displayOrder: 18 },
  { eventId: 'TECH_DS', name: 'Design Dash', category: 'Technical', description: 'UI/UX layout design under constraints.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 19 },
  { eventId: 'TECH_LB', name: 'Load Bridging', category: 'Technical', description: 'Build bridges using structural components to bear maximum load.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 4, displayOrder: 20 },

  // --- Creative Events (10) ---
  { eventId: 'CRE_PP', name: 'Poster Presentation', category: 'Creative', description: 'Design and explain visual research posters.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 2, displayOrder: 21 },
  { eventId: 'CRE_FP', name: 'Face Painting', category: 'Creative', description: 'Unleash your artistic touch on face canvas.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 2, displayOrder: 22 },
  { eventId: 'CRE_PT', name: 'Pot Painting', category: 'Creative', description: 'Paint decorative pots following themes.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 23 },
  { eventId: 'CRE_PH', name: 'Photography', category: 'Creative', description: 'On-spot photography competition around the campus.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 24 },
  { eventId: 'CRE_GE', name: 'Green Earth Challenge', category: 'Creative', description: 'Invent creative recycling solutions and displays.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 3, displayOrder: 25 },
  { eventId: 'CRE_CR', name: 'Cricket', category: 'Creative', description: '8-a-side box cricket tournament.', individualAllowed: false, teamAllowed: true, minMembers: 8, maxMembers: 8, displayOrder: 26 },
  { eventId: 'CRE_NF', name: 'Need For Speed', category: 'Creative', description: 'Racing simulator championship.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 27 },
  { eventId: 'CRE_BG', name: 'Battle Ground Mobile India', category: 'Creative', description: 'BGMI eSports tactical battle royale.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 4, displayOrder: 28 },
  { eventId: 'CRE_FF', name: 'Free Fire', category: 'Creative', description: 'Free Fire mobile survival battle.', individualAllowed: true, teamAllowed: true, minMembers: 1, maxMembers: 4, displayOrder: 29 },
  { eventId: 'CRE_TD', name: 'Technical Debate', category: 'Creative', description: 'Debate on hot topics in AI and tech.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 30 },

  // --- Cultural Events (15) ---
  { eventId: 'CUL_GW', name: 'Group Ramp Walk', category: 'Cultural', description: 'Walk the fashion runway in groups.', individualAllowed: false, teamAllowed: true, minMembers: 4, maxMembers: 8, displayOrder: 31 },
  { eventId: 'CUL_SW', name: 'Solo Ramp Walk', category: 'Cultural', description: 'Walk the runway solo.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 32 },
  { eventId: 'CUL_TH', name: 'Treasure Hunt', category: 'Cultural', description: 'Follow clues across campus to find the hidden artifact.', individualAllowed: false, teamAllowed: true, minMembers: 5, maxMembers: 5, displayOrder: 33 },
  { eventId: 'CUL_TW', name: 'Tug Of War', category: 'Cultural', description: 'Classic game of strength and coordination.', individualAllowed: false, teamAllowed: true, minMembers: 5, maxMembers: 5, displayOrder: 34 },
  { eventId: 'CUL_SD', name: 'Sudoku', category: 'Cultural', description: 'Grid-based number puzzle solver sprint.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 35 },
  { eventId: 'CUL_FC', name: 'Fire Free Cooking', category: 'Cultural', description: 'Prepare snacks and salads without heat sources.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 4, displayOrder: 36 },
  { eventId: 'CUL_SS', name: 'Solo Singing', category: 'Cultural', description: 'Vocal music performances.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 37 },
  { eventId: 'CUL_SDN', name: 'Solo Dance', category: 'Cultural', description: 'Choreographed dance performance.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 38 },
  { eventId: 'CUL_GS', name: 'Group Singing', category: 'Cultural', description: 'Vocal choruses and ensembles.', individualAllowed: false, teamAllowed: true, minMembers: 2, maxMembers: 6, displayOrder: 39 },
  { eventId: 'CUL_GD', name: 'Group Dance', category: 'Cultural', description: 'Team dance choreography.', individualAllowed: false, teamAllowed: true, minMembers: 5, maxMembers: 10, displayOrder: 40 },
  { eventId: 'CUL_RP', name: 'Rap', category: 'Cultural', description: 'Showcase flow and wordplay.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 41 },
  { eventId: 'CUL_BB', name: 'Beat Boxing', category: 'Cultural', description: 'Produce beats using vocal cords.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 42 },
  { eventId: 'CUL_PT', name: 'Poetry', category: 'Cultural', description: 'Recite original written poems.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 43 },
  { eventId: 'CUL_ST', name: 'Story Telling', category: 'Cultural', description: 'Captivate the audience with narratives.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 44 },
  { eventId: 'CUL_AA', name: 'Art Attack', category: 'Cultural', description: 'Sketching, painting, and art creation.', individualAllowed: true, teamAllowed: false, minMembers: 1, maxMembers: 1, displayOrder: 45 }
];

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  
  try {
    console.log(`Connecting to configured MongoDB database...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000 // 4 seconds timeout
    });
    console.log(`MongoDB Connected (Cloud/Host): ${conn.connection.host}`);
    
    // Seed Events on Cloud/Host if not already populated
    const Event = require('../models/Event');
    const count = await Event.countDocuments();
    if (count === 0) {
      console.log('Seeding cloud/host database with default events...');
      await Event.insertMany(initialEvents);
      console.log('Successfully seeded cloud/host database with 45 events!');
    }
  } catch (error) {
    console.warn(`\n[DB WARNING] Failed to connect to MongoDB Atlas/Host: ${error.message}`);
    console.warn(`This is likely due to your current IP address not being whitelisted in MongoDB Atlas.`);
    console.log(`Attempting to launch an in-memory MongoDB database for testing...\n`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      const conn = await mongoose.connect(mongoUri);
      console.log(`MongoDB Connected (In-Memory Fallback): ${conn.connection.host}`);
      console.log(`In-Memory URI: ${mongoUri}\n`);
      
      // Auto-seed in-memory database with events
      const Event = require('../models/Event');
      const count = await Event.countDocuments();
      if (count === 0) {
        console.log('Seeding in-memory database with default events...');
        await Event.insertMany(initialEvents);
        console.log('Successfully seeded in-memory database with 45 events!\n');
      }
      
      // Store reference on global so we can close it during shutdown
      global.mongoServerInstance = mongoServer;
    } catch (innerError) {
      console.error('Failed to start in-memory MongoDB database:', innerError.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
