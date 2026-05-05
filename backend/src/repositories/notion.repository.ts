import { Client } from "@notionhq/client";
import { Task } from "../schemas/task.schema";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

/**
 * Notionに新しいページを作成する
 */
export const createPage = async (task: Task) => {
  return await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: task.title } }] },
      Status: { status: { name: task.status } },
      _Area: { select: { name: task.area } },
      _Type: { select: { name: task.type } },
      _Topics: { multi_select: task.topics.map((t) => ({ name: t })) },
      _Flags: { multi_select: task.flags.map((f) => ({ name: f })) },
      Description: { rich_text: [{ text: { content: task.content } }] },
      Date: task.dueDate ? { date: { start: task.dueDate } } : undefined,
    },
  });
};

/**
 * Notionの既存ページを更新する
 */
export const updatePage = async (pageId: string, task: Partial<Task>) => {
  const props: any = {};
  if (task.title) props.Name = { title: [{ text: { content: task.title } }] };
  if (task.status) props.Status = { status: { name: task.status } };
  if (task.area) props._Area = { select: { name: task.area } };
  if (task.type) props._Type = { select: { name: task.type } };
  if (task.topics)
    props._Topics = { multi_select: task.topics.map((t) => ({ name: t })) };
  if (task.flags)
    props._Flags = { multi_select: task.flags.map((f) => ({ name: f })) };
  if (task.content)
    props.Description = { rich_text: [{ text: { content: task.content } }] };
  if (task.dueDate !== undefined)
    props.Date = { date: task.dueDate ? { start: task.dueDate } : null };

  return await notion.pages.update({
    page_id: pageId,
    properties: props,
  });
};

/**
 * Notionから全データを取得する（同期用）
 */
export const fetchAllPages = async () => {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    sorts: [{ property: "Date", direction: "descending" }],
  });
  return response.results;
};
