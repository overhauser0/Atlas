import * as notionRepo from '../repositories/notion.repository';

// --- ユーティリティ: 対象月の週（月曜日起点）を計算する ---
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

// --- Notionのテキスト抽出ヘルパー ---
const getText = (property: any) => property?.rich_text?.[0]?.plain_text || '';

/**
 * 月次レビューとそれに紐づく週次レビューを取得（無ければ自動生成）する
 */
export const getOrCreateMonthlyReview = async (yearMonth: string) => {
  // 1. 日付の計算
  const year = parseInt(yearMonth.substring(0, 4));
  const month = parseInt(yearMonth.substring(4, 6));
  const firstDayOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;

  // 2. Monthlyデータの取得・生成（Repositoryに依頼）
  let monthlyPage = await notionRepo.findMonthlyPage(yearMonth);
  if (!monthlyPage) {
    console.log(`Creating new Monthly page for ${yearMonth}...`);
    monthlyPage = await notionRepo.createMonthlyPage(
      yearMonth,
      firstDayOfMonth,
    );
  }

  // 3. Weeklyデータの取得・生成（Repositoryに依頼）
  const targetWeeks = getWeeksInMonth(year, month);
  const weeklyPromises = targetWeeks.map(async (week) => {
    let weeklyPage = await notionRepo.findWeeklyPage(week.name);
    if (!weeklyPage) {
      console.log(`Creating new Weekly page for ${week.name}...`);
      weeklyPage = await notionRepo.createWeeklyPage(week.name, week.startDate);
    }
    return weeklyPage;
  });

  const weeklyPages = await Promise.all(weeklyPromises);

  // 4. フロントエンド（UI）が使いやすい形に綺麗に盛り付けて（整形して）返す
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

/**
 * レビューのテキストを更新する
 */
export const updateReviewText = async (
  pageId: string,
  propertyName: string,
  text: string,
) => {
  // Service層としてのバリデーション（空文字の処理など）をここで行うことも可能
  const safeText = text || '';
  return await notionRepo.updatePageTextProperty(
    pageId,
    propertyName,
    safeText,
  );
};
