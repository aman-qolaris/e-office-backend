import eventBus, { EVENTS } from "../../../events/eventBus.js";
import { getIO } from "../../../config/socket.js";

eventBus.on(
  EVENTS.FILE_MOVED,
  ({ receiverId, fileId, action, senderId, message }) => {
    try {
      const io = getIO();
      io.to(`user_${receiverId}`).emit("new_file_received", {
        message: message || "A new file has been forwarded to you.",
        fileId,
        action,
        senderId,
      });
      console.log(`✅ Real-time notification sent to user_${receiverId}`);
    } catch (error) {
      console.error("❌ Socket emission failed for FILE_MOVED:", error);
    }
  },
);
