import { AI_VIDEO_NOTICE } from "@/lib/video/ai-video";

/** The required notice shown beneath any AI-generated/enhanced video. */
export default function AiVideoNotice() {
  return (
    <p
      role="note"
      style={{
        fontSize: "0.76rem",
        lineHeight: 1.5,
        color: "#8a6d2f",
        background: "rgba(198,161,90,0.12)",
        border: "1px solid rgba(198,161,90,0.4)",
        borderRadius: "10px",
        padding: "0.6rem 0.85rem",
        margin: "0.6rem 0 0",
      }}
    >
      <strong>⚠ AI content notice:</strong> {AI_VIDEO_NOTICE}
    </p>
  );
}
