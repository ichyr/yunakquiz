import type { InterfaceLanguage } from '@yunakquiz/core';
import type { Mail } from './mailer.ts';

/** Mails are written in the Account's Interface Language. Links are plain URLs, nothing else. */

export function verificationMail(language: InterfaceLanguage, to: string, link: string): Mail {
  return language === 'uk'
    ? {
        to,
        subject: 'Підтвердіть електронну адресу в Yunakquiz',
        text: `Щоб підтвердити адресу, відкрийте посилання (діє 24 години, один раз):\n\n${link}\n\nЯкщо ви не реєструвалися, просто проігноруйте цей лист.`,
      }
    : {
        to,
        subject: 'Confirm your email address for Yunakquiz',
        text: `To confirm your address, open this link (valid for 24 hours, works once):\n\n${link}\n\nIf you did not register, ignore this mail.`,
      };
}

export function existingAccountMail(
  language: InterfaceLanguage,
  to: string,
  links: { login: string; reset: string },
): Mail {
  return language === 'uk'
    ? {
        to,
        subject: 'У вас уже є обліковий запис Yunakquiz',
        text: `Хтось спробував зареєструватися з цією адресою, але обліковий запис уже існує.\n\nУвійти: ${links.login}\nСкинути пароль: ${links.reset}\n\nЯкщо це були не ви, нічого робити не потрібно.`,
      }
    : {
        to,
        subject: 'You already have a Yunakquiz Account',
        text: `Someone tried to register with this address, but an Account already exists.\n\nLog in: ${links.login}\nReset your password: ${links.reset}\n\nIf this was not you, you need do nothing.`,
      };
}
