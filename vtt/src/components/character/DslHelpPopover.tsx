import { useState } from 'react';
import { Popover, ActionIcon, Tooltip } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';
import './DslHelpPopover.css';

export function DslHelpPopover() {
  const [opened, setOpened] = useState(false);

  return (
    <div className="dsl-help-popover__anchor">
      <Popover
        opened={opened}
        onChange={setOpened}
        position="top-end"
        width={400}
        shadow="lg"
        withArrow
        withinPortal={false}
      >
        <Popover.Target>
          <Tooltip label="Syntax Help" position="left" openDelay={300} withinPortal={false}>
            <ActionIcon
              size="md"
              variant="subtle"
              color="gray"
              radius="xl"
              className="dsl-help-popover__trigger"
              onClick={() => setOpened((o) => !o)}
            >
              <IconQuestionMark size={16} stroke={2} />
            </ActionIcon>
          </Tooltip>
        </Popover.Target>

        <Popover.Dropdown className="dsl-help-popover__dropdown">
          <div className="dsl-help-popover__title">Character Sheet Syntax</div>
          <div className="dsl-help-popover__intro">
            Just type normally — this is a rich text editor. Use the special
            syntax below to add interactive stats, dice buttons, and more.
            Press <kbd>/</kbd> to insert any of these via the command palette.
          </div>

          <div className="dsl-help-popover__section-title">Declaring Stats</div>
          <div className="dsl-help-popover__section">
            <div className="dsl-help-popover__entry">
              <code className="dsl-help-popover__syntax">HP:: 10</code>
              <span className="dsl-help-popover__desc">
                Creates a stat called HP with value 10. Stats become interactive
                chips you can click to edit. Other widgets can reference them by name.
              </span>
            </div>
            <div className="dsl-help-popover__entry">
              <code className="dsl-help-popover__syntax">HP:: 10 #bar</code>
              <span className="dsl-help-popover__desc">
                Adding <code className="dsl-help-popover__syntax dsl-help-popover__syntax--tag">#bar</code> maps
                this stat to your token's HP bar on the map.
                Use <code className="dsl-help-popover__syntax dsl-help-popover__syntax--tag">#barmax</code> for
                the max value, <code className="dsl-help-popover__syntax dsl-help-popover__syntax--tag">#badge</code> for
                the token badge (e.g. AC).
              </span>
            </div>
          </div>

          <div className="dsl-help-popover__section-title">Widgets</div>
          <div className="dsl-help-popover__section">
            <div className="dsl-help-popover__entry">
              <code className="dsl-help-popover__syntax">[bar: HP/MaxHP]</code>
              <span className="dsl-help-popover__desc">
                A visual health/resource bar. Values update live from your stats.
              </span>
            </div>
            <div className="dsl-help-popover__entry">
              <code className="dsl-help-popover__syntax">[dots: 3/5]</code>
              <span className="dsl-help-popover__desc">
                Clickable dot tracker for spell slots, ammo, etc. (max 10).
              </span>
            </div>
            <div className="dsl-help-popover__entry">
              <code className="dsl-help-popover__syntax">{'{{ STR + PROF }}'}</code>
              <span className="dsl-help-popover__desc">
                Live computed value — references stats and does math automatically.
              </span>
            </div>
          </div>

          <div className="dsl-help-popover__section-title">Dice & Actions</div>
          <div className="dsl-help-popover__section">
            <div className="dsl-help-popover__entry">
              <code className="dsl-help-popover__syntax">[Attack](action: 1d20 + STR)</code>
              <span className="dsl-help-popover__desc">
                A clickable dice button. Rolls the formula (resolving stat names),
                and broadcasts the result to the chat for everyone to see.
              </span>
            </div>
            <div className="dsl-help-popover__entry">
              <code className="dsl-help-popover__syntax">[Cast](action: 1d20 + INT; cost: SpellSlots)</code>
              <span className="dsl-help-popover__desc">
                Add <code>; cost: StatName</code> to auto-deduct a resource when clicked.
              </span>
            </div>
          </div>

          <div className="dsl-help-popover__section-title">Snippets</div>
          <div className="dsl-help-popover__section">
            <div className="dsl-help-popover__entry">
              <code className="dsl-help-popover__syntax">[[SnippetName]]</code>
              <span className="dsl-help-popover__desc">
                Embeds a reusable snippet from the snippet library. Great for
                shared spell blocks, class features, etc.
              </span>
            </div>
          </div>

          <div className="dsl-help-popover__tip">
            Tip: Select text for formatting options. Type on an empty line to see block insert options.
          </div>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
