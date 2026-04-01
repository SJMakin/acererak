import { BubbleMenu } from '@tiptap/react/menus';
import { ActionIcon, Tooltip } from '@mantine/core';
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconLink,
} from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import './BubbleToolbar.css';

interface BubbleToolbarProps {
  editor: Editor;
}

export function BubbleToolbar({ editor }: BubbleToolbarProps) {
  const iconSize = 16;
  const stroke = 2;

  const handleLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <BubbleMenu
      editor={editor}
      className="bubble-toolbar"
    >
      <Tooltip label="Bold" openDelay={400} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant={editor.isActive('bold') ? 'filled' : 'subtle'}
          color="gray"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <IconBold size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Italic" openDelay={400} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant={editor.isActive('italic') ? 'filled' : 'subtle'}
          color="gray"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <IconItalic size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Strikethrough" openDelay={400} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant={editor.isActive('strike') ? 'filled' : 'subtle'}
          color="gray"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <IconStrikethrough size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Code" openDelay={400} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant={editor.isActive('code') ? 'filled' : 'subtle'}
          color="gray"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <IconCode size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>

      <div className="bubble-toolbar__separator" />

      <Tooltip label="Heading 1" openDelay={400} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant={editor.isActive('heading', { level: 1 }) ? 'filled' : 'subtle'}
          color="gray"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <IconH1 size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Heading 2" openDelay={400} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant={editor.isActive('heading', { level: 2 }) ? 'filled' : 'subtle'}
          color="gray"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <IconH2 size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Heading 3" openDelay={400} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant={editor.isActive('heading', { level: 3 }) ? 'filled' : 'subtle'}
          color="gray"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <IconH3 size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>

      <div className="bubble-toolbar__separator" />

      <Tooltip label="Link" openDelay={400} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant={editor.isActive('link') ? 'filled' : 'subtle'}
          color="gray"
          onClick={handleLink}
        >
          <IconLink size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
    </BubbleMenu>
  );
}
