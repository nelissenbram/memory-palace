"use client";

import React, { useState, useTransition } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Comment } from "@/lib/social/comment-actions";
import { addComment, deleteComment } from "@/lib/social/comment-actions";

interface CommentThreadProps {
  targetType: string;
  targetId: string;
  initialComments: Comment[];
  currentUserId?: string;
}

function SingleComment({
  comment,
  targetType,
  targetId,
  currentUserId,
  depth,
  onReply,
  onDelete,
}: {
  comment: Comment;
  targetType: string;
  targetId: string;
  currentUserId?: string;
  depth: number;
  onReply: (parentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}) {
  const { t } = useTranslation("social");
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleReply = () => {
    if (!replyText.trim()) return;
    startTransition(async () => {
      await onReply(comment.id, replyText.trim());
      setReplyText("");
      setShowReply(false);
    });
  };

  const handleDelete = () => {
    if (!window.confirm(t("confirmDeleteComment"))) return;
    startTransition(async () => {
      await onDelete(comment.id);
    });
  };

  const timeAgo = (() => {
    const diff = Date.now() - new Date(comment.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return t("minutesAgo", { count: String(mins) });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("hoursAgo", { count: String(hours) });
    const days = Math.floor(hours / 24);
    return t("daysAgo", { count: String(days) });
  })();

  return (
    <div
      style={{
        marginLeft: depth > 0 ? "1.5rem" : 0,
        borderLeft: depth > 0 ? `2px solid ${T.color.lineFaint}` : "none",
        paddingLeft: depth > 0 ? "1rem" : 0,
        marginTop: "0.75rem",
      }}
    >
      <div style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}>
        {/* Avatar */}
        <div
          style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "50%",
            background: comment.user_avatar
              ? `url(${comment.user_avatar}) center/cover`
              : `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
            border: `1.5px solid ${T.color.goldLight}`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.color.cream,
            fontFamily: T.font.display,
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
        >
          {!comment.user_avatar &&
            (comment.user_name?.[0]?.toUpperCase() || "?")}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + time */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "baseline",
            }}
          >
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: T.color.charcoal,
              }}
            >
              {comment.user_name || t("anonymous")}
            </span>
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                color: T.color.muted,
              }}
            >
              {timeAgo}
            </span>
          </div>

          {/* Body */}
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              color: T.color.inkSoft,
              margin: "0.25rem 0 0",
              lineHeight: 1.5,
              wordBreak: "break-word",
            }}
          >
            {comment.body}
          </p>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.375rem" }}>
            {depth < 2 && (
              <button
                onClick={() => setShowReply(!showReply)}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.muted,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.375rem 0.5rem",
                  minHeight: "2.75rem",
                }}
              >
                {t("reply")}
              </button>
            )}
            {currentUserId === comment.user_id && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.error,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.375rem 0.5rem",
                  minHeight: "2.75rem",
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                {t("deleteComment")}
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReply && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("writeReply")}
                aria-label={t("writeReply")}
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                style={{
                  flex: 1,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${T.color.sandstone}`,
                  background: T.color.cream,
                  color: T.color.charcoal,
                  outline: "none",
                }}
              />
              <button
                onClick={handleReply}
                disabled={isPending || !replyText.trim()}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: T.color.gold,
                  color: T.color.cream,
                  cursor: isPending ? "wait" : "pointer",
                  opacity: isPending || !replyText.trim() ? 0.5 : 1,
                }}
              >
                {t("send")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies.map((reply) => (
        <SingleComment
          key={reply.id}
          comment={reply}
          targetType={targetType}
          targetId={targetId}
          currentUserId={currentUserId}
          depth={depth + 1}
          onReply={onReply}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default function CommentThread({
  targetType,
  targetId,
  initialComments,
  currentUserId,
}: CommentThreadProps) {
  const { t } = useTranslation("social");
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newText, setNewText] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePost = () => {
    if (!newText.trim()) return;
    startTransition(async () => {
      const { ok, comment } = await addComment({
        targetType,
        targetId,
        body: newText.trim(),
      });
      if (ok && comment) {
        setComments((prev) => [...prev, comment]);
        setNewText("");
      }
    });
  };

  const handleReply = async (parentId: string, body: string) => {
    const { ok, comment: reply } = await addComment({
      targetType,
      targetId,
      body,
      parentId,
    });
    if (ok && reply) {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return { ...c, replies: [...c.replies, reply] };
          }
          // Check nested replies
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === parentId ? { ...r, replies: [...r.replies, reply] } : r
            ),
          };
        })
      );
    }
  };

  const handleDelete = async (commentId: string) => {
    const { ok } = await deleteComment(commentId);
    if (ok) {
      const removeComment = (list: Comment[]): Comment[] =>
        list
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: removeComment(c.replies),
          }));
      setComments(removeComment);
    }
  };

  return (
    <div>
      {/* Comment list */}
      {comments.length === 0 ? (
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            textAlign: "center",
            padding: "1rem 0",
          }}
        >
          {t("noComments")}
        </p>
      ) : (
        comments.map((comment) => (
          <SingleComment
            key={comment.id}
            comment={comment}
            targetType={targetType}
            targetId={targetId}
            currentUserId={currentUserId}
            depth={0}
            onReply={handleReply}
            onDelete={handleDelete}
          />
        ))
      )}

      {/* New comment input */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: `1px solid ${T.color.lineFaint}`,
        }}
      >
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t("writeComment")}
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handlePost();
            }
          }}
          style={{
            flex: 1,
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            padding: "0.625rem 1rem",
            borderRadius: "0.625rem",
            border: `1px solid ${T.color.sandstone}`,
            background: T.color.cream,
            color: T.color.charcoal,
            outline: "none",
          }}
        />
        <button
          onClick={handlePost}
          disabled={isPending || !newText.trim()}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            padding: "0.625rem 1rem",
            borderRadius: "0.625rem",
            border: "none",
            background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
            color: T.color.cream,
            cursor: isPending ? "wait" : "pointer",
            opacity: isPending || !newText.trim() ? 0.5 : 1,
          }}
        >
          {t("post")}
        </button>
      </div>
    </div>
  );
}
