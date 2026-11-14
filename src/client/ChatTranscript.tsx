import { openPageLink } from './page-navigation';
import { Children, Fragment, useState, type ReactElement, type ReactNode } from 'react';
import { PhoneOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { AssistantMessage, Message } from '@ag-ui/core';
import type { CallReceipt } from '../shared/types';
import { voiceReceiptMessagePrefix } from '../shared/voice-receipt';
import { isScheduledTaskMessage } from '../shared/scheduled-message';
// These markers only control rendering; they do not confer trust or permissions.
export function isInternalVoiceReceipt(message: Message): boolean {
  const metadata = message.metadata;
  return (
    message.role === 'user' &&
    (message.id.startsWith(voiceReceiptMessagePrefix) ||
      (!!metadata &&
        typeof metadata === 'object' &&
        'opendotsSource' in metadata &&
        metadata.opendotsSource === 'voice_receipt'))
  );
}
function Receipt({ call }: { call: CallReceipt }) {
  return (
    <div className="call-receipt">
      <PhoneOff size={13} />
      <span>
        {call.status === 'failed'
          ? 'Call failed'
          : call.endedAt
            ? `${Math.round((call.endedAt - call.startedAt) / 1000)}s · Call ended`
            : 'Call in progress'}
      </span>
      {call.error && <small>{call.error}</small>}
    </div>
  );
}
function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeChild = Children.toArray(children)[0] as ReactElement<{
    className?: string;
    children?: ReactNode;
  }>;
  const className = codeChild?.props?.className ?? '';
  const language =
    (typeof className === 'string' &&
      className.match(/language-([\w-]+)/)?.[1]) ||
    'code';
  const text = Children.toArray(codeChild?.props?.children)
    .map((child) => (typeof child === 'string' ? child : ''))
    .join('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{language}</span>
        <button type="button" className="code-copy-btn" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre>
        <code className={className}>{text}</code>
      </pre>
    </div>
  );
}
export function ChatTranscript({
  messages,
  calls,
  renderTools,
}: {
  messages: Message[];
  calls: CallReceipt[];
  renderTools?: (message: AssistantMessage) => ReactNode;
}) {
  const ids = new Set(messages.map((message) => message.id));
  return (
    <>
      {calls
        .filter(
          (call) => !call.anchorMessageId || !ids.has(call.anchorMessageId),
        )
        .map((call) => (
          <Receipt key={call.id} call={call} />
        ))}
      {messages.map((message) => (
        <Fragment key={message.id}>
          {typeof message.content === 'string' && message.content.trim() && (
            <div
              className={`chat-bubble ${message.role}${isScheduledTaskMessage(message) ? ' scheduled' : ''}`}
            >
              {isScheduledTaskMessage(message) && (
                <span className="scheduled-message-label">Scheduled</span>
              )}
              <ReactMarkdown
                components={{
                  pre: CodeBlock,
                  img: ({ alt }) => <span>{alt}</span>,
                  a: ({ href, children }) => (
                    <a
                      onClick={(event) => {
                        if (href?.startsWith('/#/spaces/')) {
                          event.preventDefault();
                          openPageLink(href);
                        }
                      }}
                      href={href}
                      target={
                        href?.startsWith('/#/spaces/') ? undefined : '_blank'
                      }
                      rel="noreferrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {String(message.content)}
              </ReactMarkdown>
            </div>
          )}
          {message.role === 'assistant' && renderTools?.(message)}
          {calls
            .filter((call) => call.anchorMessageId === message.id)
            .map((call) => (
              <Receipt key={call.id} call={call} />
            ))}
        </Fragment>
      ))}
    </>
  );
}
