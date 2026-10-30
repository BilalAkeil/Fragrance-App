import "server-only";
import type { NotificationEvent } from "@fragrance/core";
import { createServiceClient } from "@/lib/supabase/service";

// Raises an in-app notification (010's notify()). Each event fires once per
// person and thing, so calling this again for the same one does nothing.
export async function notify(
  userId: string,
  event: NotificationEvent,
  entityId: string,
  link: string,
  data: Record<string, unknown> = {},
) {
  const { error } = await createServiceClient()
    .from("notifications")
    .upsert(
      { user_id: userId, event, entity_id: entityId, link, data },
      { onConflict: "user_id,event,entity_id", ignoreDuplicates: true },
    );
  // A missed notification shouldn't undo a payment or an order step.
  if (error) console.error(`notify ${event} for ${userId} failed:`, error.message);
}
