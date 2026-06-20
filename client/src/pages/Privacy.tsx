/**
 * Privacy page
 * Plain-language explanation of what data Nura collects and why. Linked
 * from the registration form (consent checkbox) and reachable without
 * being logged in — see the early-return in App.tsx's AppContent.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { GLASS_SURFACE } from '@/lib/glass';

export default function Privacy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-40 bg-[oklch(0.97_0.01_240)]/82 backdrop-blur-xl backdrop-saturate-150 border-b border-[oklch(0.97_0.01_240)]/45">
        <div
          className="container app-shell py-4 flex items-center gap-3"
          style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
        >
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-full -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-bold text-primary">Конфиденциальность</h1>
        </div>
      </header>

      <main className="container app-shell py-6">
        <div className={cn('p-5 sm:p-6 rounded-2xl border space-y-5 text-sm leading-relaxed text-foreground', GLASS_SURFACE)}>
          <p className="text-muted-foreground">
            Последнее обновление: 20 июня 2026 г. Этот текст написан простым языком, без юридического канцелярита —
            если что-то непонятно, пиши на почту в конце страницы.
          </p>

          <section>
            <h2 className="font-heading font-bold text-base mb-1.5">Какие данные мы собираем</h2>
            <p>
              Email и пароль (пароль хранится в хешированном виде — мы физически не видим его в открытом тексте).
              По желанию: имя, рост, вес, год рождения, пол. Записи о приёмах пищи (название, калории, БЖУ, время)
              и записи о выпитой воде. Если вы используете анализ фото блюда — само фото на момент запроса к ИИ.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-base mb-1.5">Зачем</h2>
            <p>
              Чтобы считать калории и БЖУ, показывать прогресс по целям и не заставлять вас вводить одно и то же
              блюдо вручную каждый раз. Больше ни для чего — рекламы, профилирования или продажи данных в Nura нет.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-base mb-1.5">Фото блюд и ИИ-анализ</h2>
            <p>
              Если вы пользуетесь кнопкой «Анализ фото», снимок отправляется в Google Gemini для распознавания блюда
              и оценки калорийности. Сама оценка — приблизительная, как и любое распознавание на глаз. Nura не
              сохраняет фото на сервере — оно используется только на время запроса и не пишется в базу данных.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-base mb-1.5">Где и как храним</h2>
            <p>
              Данные хранятся на сервере приложения (Railway), в базе данных, доступ к которой есть только у
              разработчика Nura. Авторизация работает через одну cookie-сессию — она не используется для рекламы
              или трекинга по другим сайтам.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-base mb-1.5">Удаление данных</h2>
            <p>
              Хотите удалить аккаунт и все данные — напишите на{' '}
              <a href="mailto:moremaekjupls@gmail.com" className="text-primary underline">moremaekjupls@gmail.com</a>.
              Удалим вручную в течение нескольких дней.
            </p>
          </section>

          <section>
            <h2 className="font-heading font-bold text-base mb-1.5">Важная оговорка</h2>
            <p>
              Nura — небольшое приложение, а не медицинский сервис. Оценки калорий и БЖУ (особенно через фото)
              являются приблизительными и не заменяют консультацию врача или диетолога.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
