// atlas-server/src/services/review.service.ts

import * as notionRepo from '../repositories/notion.repository';

/** 対象月の週（月曜日起点）を計算する。 */
const getWeeksInMonth = (year: number, month: number) => {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const firstThursday = new Date(firstDay);
  firstThursday.setDate(firstDay.getDate() + ((4 - firstDay.getDay() + 7) % 7));

  const currentMonday = new Date(firstThursday);
  currentMonday.setDate(firstThursday.getDate() - 3);

  while (firstThursday.getMonth() === month - 1) {
    const target = new Date(firstThursday.valueOf());
    const dayNr = (firstThursday.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursdayOfYear = new Date(target.getFullYear(), 0, 4);
    const diff = target.getTime() - firstThursdayOfYear.getTime();
    const cw =
      1 +
      Math.round(
        (diff / 86400000 - 3 + ((firstThursdayOfYear.getDay() + 6) % 7)) / 7,
      );

    weeks.push({
      name: `${year}-CW${cw.toString().padStart(2, '0')}`,
      startDate: currentMonday.toISOString().split('T')[0],
    });

    currentMonday.setDate(currentMonday.getDate() + 7);
    firstThursday.setDate(firstThursday.getDate() + 7);
  }
  return weeks;
};

/** Notionプロパティからテキストを抽出する。 */
const getText = (property: any) => property?.rich_text?.[0]?.plain_text || '';

/** 月次レビューと紐づく週次レビューを取得し、なければ作成する。 */
export const getOrCreateMonthlyReview = async (yearMonth: string) => {
  const year = parseInt(yearMonth.substring(0, 4));
  const month = parseInt(yearMonth.substring(4, 6));
  const firstDayOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;

  let monthlyPage = await notionRepo.getMonthlyPage(yearMonth);
  if (!monthlyPage) {
    monthlyPage = await notionRepo.insertMonthlyPage(
      yearMonth,
      firstDayOfMonth,
    );
  }

  const targetWeeks = getWeeksInMonth(year, month);
  const weeklyPromises = targetWeeks.map(async (week) => {
    let weeklyPage = await notionRepo.getWeeklyPage(week.name);
    if (!weeklyPage) {
      weeklyPage = await notionRepo.insertWeeklyPage(week.name, week.startDate);
    }
    return weeklyPage;
  });

  const weeklyPages = await Promise.all(weeklyPromises);

  return {
    monthly: {
      id: monthlyPage.id,
      name: yearMonth,
      startDate: firstDayOfMonth,
      business: getText((monthlyPage as any).properties.Business),
      life: getText((monthlyPage as any).properties.Life),
      summary: getText((monthlyPage as any).properties.Summary),
    },
    weekly: weeklyPages.map((page: any) => ({
      id: page.id,
      name: page.properties.Name.title[0]?.plain_text,
      startDate: page.properties.StartDate?.date?.start,
      summary: getText(page.properties.Summary),
    })),
  };
};

/** レビューのテキストを更新する。 */
export const updateReviewText = async (
  pageId: string,
  propertyName: string,
  text: string,
) => {
  const safeText = text || '';
  return await notionRepo.updatePageTextProperty(
    pageId,
    propertyName,
    safeText,
  );
};
