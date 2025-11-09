// Synthetic data generator for FinSight AI
// Entry point for data generation

const { generateData } = require('./generator');

// Run data generation
generateData()
  .then(() => {
    console.log('\n✅ Data generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Data generation failed:', error);
    process.exit(1);
  });


