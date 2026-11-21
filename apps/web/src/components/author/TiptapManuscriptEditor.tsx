"use client";

import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Quote,
  List,
  ListOrdered,
  Minus,
  Undo2,
  Redo2,
} from "lucide-react";

export interface TiptapManuscriptEditorProps {
  chapterId: string;
  initialHtml: string;
  typographyFontFamily: string;
  initialCursorOffset?: number;
  onChange: (payload: {
    html: string;
    json: Record<string, unknown>;
    text: string;
    wordCount: number;
    cursorOffset: number;
  }) => void;
}

export function TiptapManuscriptEditor({
  chapterId,
  initialHtml,
  typographyFontFamily,
  initialCursorOffset,
  onChange,
}: TiptapManuscriptEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const lastEmittedHtmlRef = useRef<string>(initialHtml || "<p></p>");
  const lastChapterIdRef = useRef<string>(chapterId);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Begin writing this chapter… your prose is preserved automatically.",
      }),
      CharacterCount,
    ],
    content: initialHtml || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[420px] px-8 py-7 focus:outline-none text-[#20242C] leading-[1.8] text-[17px] prose prose-stone max-w-none",
        "data-testid": "author-tiptap-editor",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmittedHtmlRef.current = html;
      const json = ed.getJSON() as Record<string, unknown>;
      const text = ed.getText();
      const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
      const cursorOffset = ed.state.selection.anchor;
      onChangeRef.current({ html, json, text, wordCount: words, cursorOffset });
    },
  });

  // Sync content when switching chapters OR when external mutations (revision restore / merge import) update initialHtml
  useEffect(() => {
    if (!editor) return;
    const targetHtml = initialHtml || "<p></p>";
    const chapterChanged = lastChapterIdRef.current !== chapterId;
    lastChapterIdRef.current = chapterId;

    if (chapterChanged || (targetHtml !== lastEmittedHtmlRef.current && editor.getHTML() !== targetHtml)) {
      lastEmittedHtmlRef.current = targetHtml;
      editor.commands.setContent(targetHtml, { emitUpdate: false });
      if (chapterChanged && typeof initialCursorOffset === "number" && initialCursorOffset > 0) {
        const maxPos = Math.max(1, editor.state.doc.content.size - 1);
        const clamped = Math.min(initialCursorOffset, maxPos);
        editor.commands.setTextSelection(clamped);
      }
    }
  }, [chapterId, initialHtml, initialCursorOffset, editor]);

  if (!editor) {
    return (
      <div className="min-h-[420px] rounded-xl border border-[#DDD6C8] bg-[#FFFFFF] p-8 text-sm text-[#6B7280]">
        Preparing Memoria editorial canvas…
      </div>
    );
  }

  const wordCount = editor.storage.characterCount?.words?.() ?? 0;
  const charCount = editor.storage.characterCount?.characters?.() ?? 0;

  const toolBtn = (active: boolean) =>
    `p-2 rounded-lg text-xs transition-colors border ${
      active
        ? "bg-[#76556F] text-[#FFFFFF] border-[#76556F]"
        : "bg-[#F7F4EE] text-[#20242C] border-[#E7E2DA] hover:bg-[#EFEAE0]"
    }`;

  return (
    <div className="rounded-2xl border border-[#DDD6C8] bg-[#FFFFFF] shadow-sm overflow-hidden">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#FBF9F5] border-b border-[#E7E2DA]">
        <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Manuscript formatting">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={toolBtn(editor.isActive("heading", { level: 1 }))}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={toolBtn(editor.isActive("heading", { level: 2 }))}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={toolBtn(editor.isActive("bold"))}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={toolBtn(editor.isActive("italic"))}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={toolBtn(editor.isActive("blockquote"))}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={toolBtn(editor.isActive("bulletList"))}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={toolBtn(editor.isActive("orderedList"))}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className={toolBtn(false)}
            title="Scene Break"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-px h-5 bg-[#DDD6C8] mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className={`${toolBtn(false)} disabled:opacity-40`}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className={`${toolBtn(false)} disabled:opacity-40`}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs font-medium text-[#5A606D] flex items-center gap-3">
          <span>{wordCount.toLocaleString()} words</span>
          <span className="text-[#CFC7B9]">•</span>
          <span>{charCount.toLocaleString()} chars</span>
        </div>
      </div>

      {/* Distraction-Free Living Archive Editorial Sheet */}
      <div style={{ fontFamily: typographyFontFamily }} className="bg-[#FFFFFF]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
