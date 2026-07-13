require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');

const initialEvents = [
  {
    eventId: 'WEB001',
    name: 'Web Wizard',
    category: 'Technical',
    description: 'Design and build a responsive, functional website from scratch under tight time constraints.',
    individualAllowed: true,
    teamAllowed: true,
    minMembers: 1,
    maxMembers: 2,
    displayOrder: 1,
  },
  {
    eventId: 'ROBO01',
    name: 'Robo Wars',
    category: 'Technical',
    description: 'Build a combat robot to fight in an arena. Last bot standing wins.',
    individualAllowed: false,
    teamAllowed: true,
    minMembers: 2,
    maxMembers: 4,
    displayOrder: 2,
  },
  {
    eventId: 'COD001',
    name: 'Code Sprint',
    category: 'Technical',
    description: 'Solve complex algorithmic challenges in a competitive coding environment.',
    individualAllowed: true,
    teamAllowed: false,
    minMembers: 1,
    maxMembers: 1,
    displayOrder: 3,
  },
  {
    eventId: 'CAD001',
    name: 'CAD Design',
    category: 'Technical',
    description: 'Create detailed 3D engineering designs using professional computer-aided design tools.',
    individualAllowed: true,
    teamAllowed: false,
    minMembers: 1,
    maxMembers: 1,
    displayOrder: 4,
  },
  {
    eventId: 'VAL001',
    name: 'Valorant Arena',
    category: 'Gaming',
    description: '5v5 tactical shooter tournament. Cooperate, execute tactics, and defeat your opponents.',
    individualAllowed: false,
    teamAllowed: true,
    minMembers: 5,
    maxMembers: 5,
    displayOrder: 5,
  },
  {
    eventId: 'BGMI01',
    name: 'BGMI Battlegrounds',
    category: 'Gaming',
    description: 'Survival shooter battle royale tournament. Play as a squad and secure Chicken Dinners.',
    individualAllowed: false,
    teamAllowed: true,
    minMembers: 4,
    maxMembers: 4,
    displayOrder: 6,
  },
  {
    eventId: 'FIFA01',
    name: 'FIFA Solo Clash',
    category: 'Gaming',
    description: 'Face-off head-to-head in FIFA on console. Best virtual footballer wins.',
    individualAllowed: true,
    teamAllowed: false,
    minMembers: 1,
    maxMembers: 1,
    displayOrder: 7,
  },
  {
    eventId: 'DANCE01',
    name: 'Street Beats',
    category: 'Cultural',
    description: 'Showcase your best street-style dance choreography in a solo performance.',
    individualAllowed: true,
    teamAllowed: false,
    minMembers: 1,
    maxMembers: 1,
    displayOrder: 8,
  },
  {
    eventId: 'MUSIC01',
    name: 'Acoustic Waves',
    category: 'Cultural',
    description: 'Solo or duet musical performance. Instrumental or vocal. Microphones provided.',
    individualAllowed: true,
    teamAllowed: true,
    minMembers: 1,
    maxMembers: 2,
    displayOrder: 9,
  },
  {
    eventId: 'ART001',
    name: 'Canvas Painting',
    category: 'Cultural',
    description: 'Express your artistic creativity under the given theme. Painting materials provided.',
    individualAllowed: true,
    teamAllowed: false,
    minMembers: 1,
    maxMembers: 1,
    displayOrder: 10,
  }
];

const seedDB = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Database connected successfully.');

    // Clear existing events
    console.log('Clearing existing events...');
    await Event.deleteMany({});
    
    // Insert new events
    console.log('Inserting initial events...');
    await Event.insertMany(initialEvents);
    console.log('Successfully seeded database with events!');
    
    mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
