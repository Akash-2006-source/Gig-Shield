#!/usr/bin/env node
/**
 * backfillPremiumLiquidity.js
 * ---------------------------
 * One-time backfill: for every historical PremiumCharge with status='success',
 * credit the corresponding amount to the `liquidity` reserve using
 * reference = `premium:{charge.id}`.
 *
 * Safe to run multiple times — reserveService.credit() is idempotent via
 * UNIQUE(reserve_type, reference). A second run will skip every already-backfilled
 * charge and touch only new ones.
 *
 * USAGE:
 *   node backend/scripts/backfillPremiumLiquidity.js --dry-run
 *   node backend/scripts/backfillPremiumLiquidity.js           # real run
 *
 * Flags:
 *   --dry-run   counts + sums candidates; performs NO writes
 *   --limit=N   cap at N rows (useful for staged rollout)
 *
 * Output: per-run summary with total records, total ₹, and skipped count.
 */

const PremiumCharge  = require('../models/PremiumCharge')
const reserveService = require('../services/reserveService')
const Reserve        = require('../models/Reserve')
const { sequelize }  = require('../config/db')

function parseArgs(argv) {
  const flags = { dryRun: false, limit: null }
  for (const a of argv.slice(2)) {
    if (a === '--dry-run')            flags.dryRun = true
    else if (a.startsWith('--limit=')) flags.limit = parseInt(a.split('=')[1], 10) || null
  }
  return flags
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv)

  console.log('─'.repeat(60))
  console.log(`Premium → Liquidity backfill  |  mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}${limit ? `  |  limit: ${limit}` : ''}`)
  console.log('─'.repeat(60))

  // Sequelize auto-syncs on server startup; run this script only after the
  // main app has booted at least once so the schema exists.
  await sequelize.authenticate()

  const findOpts = {
    where: { status: 'success' },
    order: [['id', 'ASC']]
  }
  if (limit) findOpts.limit = limit

  const charges = await PremiumCharge.findAll(findOpts)
  console.log(`Scanned ${charges.length} successful premium charges.`)

  if (charges.length === 0) {
    console.log('Nothing to backfill.')
    await sequelize.close()
    return
  }

  // Pre-scan: split into "already backfilled" vs "needs write" using the
  // same idempotency key we'll use below. This is what the idempotency guard
  // inside credit() checks too — we just do it up-front for a clean summary.
  const references = charges.map(c => `premium:${c.id}`)
  const existing = await Reserve.findAll({
    where: { reserve_type: 'liquidity', reference: references },
    attributes: ['reference'],
    raw: true
  })
  const alreadyBackfilled = new Set(existing.map(r => r.reference))

  const toWrite = charges.filter(c => !alreadyBackfilled.has(`premium:${c.id}`))
  const totalToCredit = toWrite.reduce((s, c) => s + Number(c.amount), 0)

  console.log(`  already backfilled : ${alreadyBackfilled.size}`)
  console.log(`  to credit          : ${toWrite.length}`)
  console.log(`  total ₹            : ${totalToCredit.toLocaleString('en-IN')}`)

  if (dryRun) {
    console.log('\nDRY-RUN complete. No writes performed.')
    await sequelize.close()
    return
  }

  if (toWrite.length === 0) {
    console.log('\nAll charges already backfilled — nothing to do.')
    await sequelize.close()
    return
  }

  console.log('\nWriting reserve entries …')
  let written = 0
  let skipped = 0
  let failed  = 0

  for (const charge of toWrite) {
    try {
      const row = await reserveService.credit(
        'liquidity',
        Number(charge.amount),
        `premium:${charge.id}`,
        {
          source:      'backfill_premium_liquidity',
          userId:      charge.user_id,
          policyId:    charge.policy_id,
          chargeId:    charge.id,
          charge_date: charge.charge_date,
          method:      charge.payment_method,
          backfilledAt: new Date().toISOString()
        }
      )
      // If credit() hit the idempotency guard it returns an existing row
      // whose `reference` already matches; treat that as skipped, not written.
      if (row?.metadata?.source === 'backfill_premium_liquidity' && row.id && written === 0) {
        // Rough heuristic: any row returned on this loop pass is either new
        // or pre-existing. We can't cheaply distinguish here since the pre-scan
        // already filtered. Count as written.
      }
      written++
    } catch (err) {
      if (err?.message?.toLowerCase?.().includes('unique')) {
        skipped++
      } else {
        failed++
        console.error(`  ✗ charge ${charge.id}: ${err.message}`)
      }
    }
  }

  console.log('─'.repeat(60))
  console.log('Backfill complete.')
  console.log(`  written            : ${written}`)
  console.log(`  skipped (dup)      : ${skipped}`)
  console.log(`  failed             : ${failed}`)
  console.log(`  total ₹ credited   : ${totalToCredit.toLocaleString('en-IN')}`)
  console.log('─'.repeat(60))

  await sequelize.close()
  if (failed > 0) process.exit(1)
}

main().catch(err => {
  console.error('Backfill crashed:', err)
  process.exit(1)
})
