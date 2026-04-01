import { FloatingMenu } from '@tiptap/react/menus';
import { ActionIcon, Tooltip } from '@mantine/core';
import {
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconBlockquote,
  IconMinus,
} from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import './FloatingInsertMenu.css';

interface FloatingInsertMenuProps {
  editor: Editor;
}

export function FloatingInsertMenu({ editor }: FloatingInsertMenuProps) {
  const iconSize = 16;
  const stroke = 1.5;

  return (
    <FloatingMenu
      editor={editor}
      className="floating-insert-menu"
    >
      <Tooltip label="Heading 1" position="right" openDelay={300} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <IconH1 size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Heading 2" position="right" openDelay={300} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <IconH2 size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Heading 3" position="right" openDelay={300} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <IconH3 size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>

      <div className="floating-insert-menu__separator" />

      <Tooltip label="Bullet List" position="right" openDelay={300} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <IconList size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Numbered List" position="right" openDelay={300} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <IconListNumbers size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Quote" position="right" openDelay={300} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <IconBlockquote size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Divider" position="right" openDelay={300} withinPortal={false}>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="gray"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <IconMinus size={iconSize} stroke={stroke} />
        </ActionIcon>
      </Tooltip>
    </FloatingMenu>
  );
}
