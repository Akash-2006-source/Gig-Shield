const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')
const User = require('./User')

const Policy = sequelize.define('Policy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  premium: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  coverage: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  // 'active' | 'paused' | 'expired' | 'cancelled'
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
})

Policy.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(Policy, { foreignKey: 'userId', as: 'policies' })

module.exports = Policy