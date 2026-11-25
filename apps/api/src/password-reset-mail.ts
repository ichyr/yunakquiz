import type { InterfaceLanguage } from '@yunakquiz/core';
import type { Mail } from './mailer.ts';

/** In the Account's Interface Language. The link is a plain URL, nothing else. */
export function passwordResetMail(language: InterfaceLanguage, to: string, link: string): Mail {
  return language === 'uk'
    ? {
        to,
        subject: 'Скидання пароля в Yunakquiz',
        text: `Щоб встановити новий пароль, відкрийте посилання (діє 1 годину, один раз):\n\n${link}\n\nЯкщо ви не просили скинути пароль, просто проігноруйте цей лист: ваш пароль не змінено.`,
      }
    : {
        to,
        subject: 'Reset your Yunakquiz password',
        text: `To set a new password, open this link (valid for 1 hour, works once):\n\n${link}\n\nIf you did not ask for this, ignore this mail: your password is unchanged.`,
      };
}
