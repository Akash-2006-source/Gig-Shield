/**
 * ClaimLabel.js
 * -------------
 * Append-only history of admin-assigned labels on claims.
 *
 * One claim may carry many ClaimLabel rows (e.g. admin A marks uncertain,
 * admin B later upgrades to fraud). The *latest* row is the current verdict;
 * older rows stay for audit. Rows are NEVER updated or deleted.
 *
 * This is the sole source of truth for ML training labels. Claim.label
 * (a denormalised single-value column from an earlier iteration) is kept
 * for backwards compat but is no longer written to.
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')
const Claim = require('./Claim')
const User  = require('./User')

const LABEL_VALUES = Object.freeze(['legit', 'fraud', 'uncertain'])

const ClaimLabel = sequelize.define('ClaimLabel', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true
  },
  claim_id: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: Claim, key: 'id' }
  },
  label: {
    type:      DataTypes.ENUM(...LABEL_VALUES),
    allowNull: false
  },
  admin_id: {
    type:       DataTypes.INTEGER,
    allowNull:  false,
    references: { model: User, key: 'id' }
  },
  reason: {
    type:      DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName:  'claim_labels',
  timestamps: false,     // append-only; no updated_at to drift
  indexes: [
    // "latest label for this claim" is the hot query
    { fields: ['claim_id', 'created_at'] },
    // "who labeled what" for admin audit
    { fields: ['admin_id'] }
  ]
})

ClaimLabel.belongsTo(Claim, { foreignKey: 'claim_id', as: 'claim' })
ClaimLabel.belongsTo(User,  { foreignKey: 'admin_id', as: 'admin' })
Claim.hasMany(ClaimLabel,   { foreignKey: 'claim_id', as: 'labels' })

module.exports = ClaimLabel
module.exports.LABEL_VALUES = LABEL_VALUES
