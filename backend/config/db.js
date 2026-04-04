const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
})

const connectDB = async () => {
  try {
    await sequelize.authenticate()
    console.log('SQLite connected')

    // sync({ force: false }) — creates tables if they don't exist, leaves existing ones alone.
    // We deliberately avoid alter:true because Sequelize+SQLite's alter implementation
    // breaks on ENUM columns and causes silent insert failures.
    // To apply schema changes, delete database.sqlite and restart.
    await sequelize.sync({ force: false })
    console.log('Database synchronised')
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  }
}

module.exports = { sequelize, connectDB }