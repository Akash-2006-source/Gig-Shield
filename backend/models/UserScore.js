/**
 * UserScore.js
 * ------------
 * Append-only history of behavior scores per user, one row per scoring run.
 *
 * Why a separate table (not a column on User):
 *   - preserves audit trail ("what score did we use to price this premium?")
 *   - lets Phase 5 ML train on features + labeled outcomes without losing history
 *   - scoring cadence may change independently of user edits
 *
 * Reading the "current" score: most recent row by (user_id, scored_at DESC).
 * A small helper can cache this on User if hot-path reads become expensive.
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')
const User = require('./User')

const UserScore = sequelize.define('UserScore', {
  id: {
    type:          DataTypes.INTEGER,
    primaryKey:    true,
    autoIncrement: true
  },
  user_id: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' }
  },
  scored_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW
  },
  // Lookback window used for this computation (in days).
  window_days: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 7
  },
  // Range [0.0, 1.0]. 1.0 = full trust / no penalties applied.
  // New users with no events get 1.0 + features.insufficient_data=true,
  // so Phase 4's premium/payout logic doesn't punish them for lack of data.
  behavior_score: {
    type:      DataTypes.FLOAT,
    allowNull: false,
    validate:  { min: 0, max: 1 }
  },
  // Raw feature bag — persisted deliberately so Phase 5 ML can retrain
  // on historical features without re-computing from events.
  // Shape: { total_events, active_days, active_hours_avg,
  //          distance_km_total, idle_fraction, avg_speed_mps,
  //          consistency_score, insufficient_data }
  features: {
    type:         DataTypes.JSON,
    allowNull:    false,
    defaultValue: {}
  },
  // Human-readable reasons the score landed where it did — drives admin UI
  // and gives a training label hint later.
  reasons: {
    type:         DataTypes.JSON,
    allowNull:    false,
    defaultValue: []
  },
  // Version of the scoring rule set used. Bump this when the rules change so
  // downstream consumers can detect model drift across rows.
  scoring_version: {
    type:         DataTypes.STRING(16),
    allowNull:    false,
    defaultValue: 'v1-rules'
  }
}, {
  tableName:  'user_scores',
  timestamps: false,
  indexes: [
    // "give me this user's latest score"
    { fields: ['user_id', 'scored_at'] }
  ]
})

UserScore.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

module.exports = UserScore
