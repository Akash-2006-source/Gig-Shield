/**
 * BehaviorEvent.js
 * ----------------
 * Append-only time-series of user behavior snapshots.
 *
 * Feeds Phase 3's nightly feature-engine (active hours, idle %, distance,
 * consistency score) and, eventually, Phase 5's behavior ML model.
 * No UPDATE/DELETE path is exposed — rows are immutable.
 *
 * Fields align with the spec's behavior inputs: GPS (lat/lng), speed,
 * idle time, plus a free-form `metadata` bag for anything else the client
 * captures (battery level, platform, accelerometer snapshot, etc.).
 *
 * Timestamps:
 *   occurred_at  — client wall-clock when the event happened; what users did
 *   received_at  — server clock when we persisted it; network/queue lag surfaces here
 * Both stored so we can detect clock skew and late-arriving batches.
 */

const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/db')
const User = require('./User')

const BehaviorEvent = sequelize.define('BehaviorEvent', {
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
  // Free-form string; starts with 'location_ping' and grows organically.
  // Locking this to an ENUM early would force schema changes every time
  // the client learns a new signal.
  event_type: {
    type:      DataTypes.STRING(32),
    allowNull: false
  },
  occurred_at: {
    type:      DataTypes.DATE,
    allowNull: false
  },
  received_at: {
    type:         DataTypes.DATE,
    allowNull:    false,
    defaultValue: DataTypes.NOW
  },
  lat: {
    type:      DataTypes.FLOAT,
    allowNull: true
  },
  lng: {
    type:      DataTypes.FLOAT,
    allowNull: true
  },
  // GPS accuracy radius in meters (browser: position.coords.accuracy)
  accuracy_m: {
    type:      DataTypes.FLOAT,
    allowNull: true
  },
  // Meters per second. Null when stationary or not reported.
  speed_mps: {
    type:      DataTypes.FLOAT,
    allowNull: true
  },
  // Seconds since last detected activity — for idle % computation.
  idle_seconds: {
    type:      DataTypes.INTEGER,
    allowNull: true
  },
  metadata: {
    type:         DataTypes.JSON,
    allowNull:    true,
    defaultValue: {}
  }
}, {
  tableName:  'behavior_events',
  timestamps: false,   // received_at / occurred_at are our timeline
  indexes: [
    // Primary access pattern: give me all events for user X, newest first.
    { fields: ['user_id', 'occurred_at'] },
    // For feature-engine rollups across time windows.
    { fields: ['occurred_at'] }
  ]
})

BehaviorEvent.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

module.exports = BehaviorEvent
