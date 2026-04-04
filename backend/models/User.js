const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')

// NOTE: All ENUM fields use DataTypes.STRING on SQLite.
// SQLite does not enforce ENUMs — Sequelize's alter:true breaks with ENUM columns.
// Validation is handled at the controller level.

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 'worker' | 'admin'
  role: {
    type: DataTypes.STRING,
    defaultValue: 'worker'
  },
  // 'Zomato' | 'Swiggy' | 'Zepto' | 'Blinkit' | 'Amazon' | 'Flipkart' | 'Other'
  platform: {
    type: DataTypes.STRING,
    allowNull: true
  },
  occupation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  platformId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deliveryZone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  avgDailyEarnings: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 700.00
  },
  workHoursPerDay: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: true,
    defaultValue: 6.0
  },
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
})

module.exports = User