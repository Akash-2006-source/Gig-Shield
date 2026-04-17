const { Sequelize } = require('sequelize')
const path = require('path')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(__dirname, '..', 'database.sqlite'),
  logging: false,
})

const connectDB = async () => {
  try {
    // Test connection
    await sequelize.authenticate()
    console.log('SQLite Connected successfully')

    // Sync all models (create tables)
    await sequelize.sync({ alter: true })
    console.log('Database synchronized')

  } catch (error) {
    console.error('Unable to connect to the database:', error)
    process.exit(1)
  }
}

module.exports = { sequelize, connectDB }