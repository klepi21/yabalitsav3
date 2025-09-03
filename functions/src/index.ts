/**
 * Firebase Cloud Functions for Yabalitsa
 * 
 * This function runs daily to decrement trial days for venues
 * and deactivate venues when their trial period expires.
 */

import { setGlobalOptions } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin
initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

interface VenueData {
  daysRemaining?: number;
  lastDecrementAt?: Timestamp;
  createdAt?: Timestamp;
  active?: boolean;
  plan?: 'trial' | 'subscription' | 'pay-per-booking';
}

/**
 * Scheduled function that runs daily at midnight Athens time
 * to decrement days remaining for all venues and handle expired periods
 */
export const decrementDaysRemaining = onSchedule(
  {
    schedule: "0 0 * * *", // Daily at midnight UTC
    timeZone: "Europe/Athens", // Athens timezone (UTC+2/+3)
    memory: "256MiB",
    maxInstances: 1, // Only need one instance for this scheduled task
  },
  async (event) => {
    const db = getFirestore();
    const venuesRef = db.collection('yabalitsa_venues');
    const now = Timestamp.now();
    
    logger.info("Starting daily days remaining decrement job for all venues", { timestamp: now.toDate() });

    try {
      // Get all venues that have a daysRemaining field (all plans can have expiring periods)
      const snapshot = await venuesRef
        .where('daysRemaining', '>', 0)
        .get();

      if (snapshot.empty) {
        logger.info("No venues found with days remaining that need decrementing");
        return;
      }

      const batch = db.batch();
      let updatedCount = 0;
      let deactivatedCount = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data() as VenueData;
        const venueId = doc.id;
        const daysRemaining = data.daysRemaining || 0;
        
        // Skip if venue already has 0 days remaining (shouldn't happen due to query, but safety check)
        if (daysRemaining <= 0) {
          continue;
        }
        
        // Get the last decrement date or creation date as fallback
        const lastDecrementAt = data.lastDecrementAt?.toDate() || data.createdAt?.toDate() || new Date();
        const currentDate = now.toDate();

        // Calculate days passed since last decrement
        const diffTime = currentDate.getTime() - lastDecrementAt.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          const newDaysRemaining = Math.max(0, daysRemaining - diffDays);
          
          // Prepare update data
          const updateData: Partial<VenueData> = {
            daysRemaining: newDaysRemaining,
            lastDecrementAt: now,
          };

          // If days remaining has expired, deactivate the venue (regardless of plan type)
          if (newDaysRemaining === 0 && data.active !== false) {
            updateData.active = false;
            deactivatedCount++;
            logger.info(`Days remaining expired for venue ${venueId} (plan: ${data.plan}), deactivating`, {
              venueId,
              plan: data.plan,
              originalDays: daysRemaining,
              daysPassed: diffDays
            });
          }

          // Add to batch
          batch.update(doc.ref, updateData);
          updatedCount++;

          logger.info(`Scheduled update for venue ${venueId}`, {
            venueId,
            plan: data.plan,
            originalDays: daysRemaining,
            newDays: newDaysRemaining,
            daysPassed: diffDays,
            willDeactivate: newDaysRemaining === 0
          });
        }
      }

      // Execute all updates in a single batch
      if (updatedCount > 0) {
        await batch.commit();
        logger.info("Daily days remaining decrement job completed successfully", {
          totalProcessed: snapshot.size,
          updatedVenues: updatedCount,
          deactivatedVenues: deactivatedCount
        });
      } else {
        logger.info("No venues needed updates");
      }

    } catch (error) {
      logger.error("Error in daily days remaining decrement job", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error; // Re-throw to mark function as failed
    }
  }
);
