import type { InterfaceLanguage } from '@yunakquiz/core';
import type { Mail } from './mailer.ts';

/** Mail for a self-service email change, in the Account's Interface Language. */
export function changeEmailMail(language: InterfaceLanguage, to: string, link: string): Mail {
  return language === 'uk'
    ? {
        to,
        subject: 'Підтвердіть нову електронну адресу в Yunakquiz',
        text: `Щоб змінити адресу облікового запису на цю, відкрийте посилання (діє 24 години, один раз):\n\n${link}\n\nЯкщо ви цього не просили, просто проігноруйте цей лист.`,
      }
    : {
        to,
        subject: 'Confirm your new email address for Yunakquiz',
        text: `To move your Account to this address, open this link (valid for 24 hours, works once):\n\n${link}\n\nIf you did not ask for this, ignore this mail.`,
      };
}
