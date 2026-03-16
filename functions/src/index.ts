/**
 * Firebase Cloud Functions for Yabalitsa
 *
 * This function runs daily to decrement trial days for venues
 * and deactivate venues when their trial period expires.
 */

import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin
initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

/**
 * Scheduled function that runs daily at midnight Athens time
 * to decrement days remaining for all venues and handle expired periods.
 *
 * Simple approach: decrement by 1 on each run.
 * Since it runs once daily, this equals 1 day per day.
 */
export const decrementDaysRemaining = onSchedule(
  {
    schedule: "0 0 * * *", // Daily at midnight
    timeZone: "Europe/Athens",
    memory: "256MiB",
    maxInstances: 1,
  },
  async () => {
    const db = getFirestore();
    const venuesRef = db.collection('yabalitsa_venues');

    logger.info("Starting daily days remaining decrement job");

    try {
      // Get all venues with daysRemaining > 0
      const snapshot = await venuesRef
        .where('daysRemaining', '>', 0)
        .get();

      if (snapshot.empty) {
        logger.info("No venues found with days remaining > 0");
        return;
      }

      const batch = db.batch();
      let updatedCount = 0;
      let deactivatedCount = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const venueId = doc.id;
        const daysRemaining = data.daysRemaining as number;
        const newDaysRemaining = daysRemaining - 1;

        const updateData: Record<string, unknown> = {
          daysRemaining: newDaysRemaining,
          updatedAt: new Date(),
        };

        // If expired, deactivate
        if (newDaysRemaining <= 0) {
          updateData.daysRemaining = 0;
          updateData.active = false;
          deactivatedCount++;
          logger.info(`Venue ${venueId} expired — deactivating`, {
            venueId,
            plan: data.plan,
            previousDays: daysRemaining,
          });
        }

        batch.update(doc.ref, updateData);
        updatedCount++;

        logger.info(`Venue ${venueId}: ${daysRemaining} → ${newDaysRemaining} days`, {
          venueId,
          plan: data.plan,
        });
      }

      if (updatedCount > 0) {
        await batch.commit();
        logger.info("Decrement job completed", {
          totalProcessed: snapshot.size,
          updated: updatedCount,
          deactivated: deactivatedCount,
        });
      }
    } catch (error) {
      logger.error("Error in decrement job", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
);
