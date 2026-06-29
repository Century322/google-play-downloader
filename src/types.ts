export interface AppListItem {
  title: string;
  appId: string;
  url: string;
  icon: string;
  developer: string;
  developerId?: string;
  priceText?: string;
  free?: boolean;
  scoreText?: string;
  score?: number;
  summary?: string;
}

export interface AppDetails {
  title: string;
  appId: string;
  url: string;
  icon: string;
  developer: string;
  developerId: string;
  developerEmail?: string;
  developerWebsite?: string;
  developerAddress?: string;
  free: boolean;
  price: string;
  priceText?: string;
  score: number;
  scoreText: string;
  ratingsCount?: number;
  reviewsCount?: number;
  installs: string;
  released: string;
  updated: number;
  version: string;
  summary: string;
  description: string;
  descriptionHTML?: string;
  genre: string;
  genreId: string;
  familyGenre?: string;
  familyGenreId?: string;
  size: string;
  contentRating: string;
  screenshots: string[];
  video?: string;
  videoImage?: string;
  comments?: string[];
}

export type CollectionType = "TOP_FREE" | "TOP_PAID" | "GROSSING";

export interface CategoryItem {
  id: string;
  name: string;
}

export interface TrackedApp {
  appId: string;
  title: string;
  icon: string;
  version: string;
  trackedAt: number;
  developer: string;
}

export const PLAY_STORE_CATEGORIES: CategoryItem[] = [
  { id: "", name: "全部分类" },
  { id: "APPLICATION", name: "应用" },
  { id: "ANDROID_WEAR", name: "Wear OS" },
  { id: "ART_AND_DESIGN", name: "艺术与设计" },
  { id: "AUTO_AND_VEHICLES", name: "汽车与交通" },
  { id: "BEAUTY", name: "美妆" },
  { id: "BOOKS_AND_REFERENCE", name: "图书与参考" },
  { id: "BUSINESS", name: "商业" },
  { id: "COMICS", name: "漫画" },
  { id: "COMMUNICATION", name: "通讯" },
  { id: "DATING", name: "交友" },
  { id: "EDUCATION", name: "教育" },
  { id: "ENTERTAINMENT", name: "娱乐" },
  { id: "EVENTS", name: "活动" },
  { id: "FINANCE", name: "财务" },
  { id: "FOOD_AND_DRINK", name: "美食与饮品" },
  { id: "HEALTH_AND_FITNESS", name: "健康与健身" },
  { id: "HOUSE_AND_HOME", name: "家居" },
  { id: "LIBRARIES_AND_DEMO", name: "库与 Demo" },
  { id: "LIFESTYLE", name: "生活方式" },
  { id: "MAPS_AND_NAVIGATION", name: "地图与导航" },
  { id: "MEDICAL", name: "医疗" },
  { id: "MUSIC_AND_AUDIO", name: "音乐与音频" },
  { id: "NEWS_AND_MAGAZINES", name: "新闻与杂志" },
  { id: "PARENTING", name: "育儿" },
  { id: "PERSONALIZATION", name: "个性化" },
  { id: "PHOTOGRAPHY", name: "摄影" },
  { id: "PRODUCTIVITY", name: "效率" },
  { id: "SHOPPING", name: "购物" },
  { id: "SOCIAL", name: "社交" },
  { id: "SPORTS", name: "体育" },
  { id: "TOOLS", name: "工具" },
  { id: "TRAVEL_AND_LOCAL", name: "旅行与本地" },
  { id: "VIDEO_PLAYERS", name: "视频播放器" },
  { id: "WATCH_FACE", name: "表盘" },
  { id: "WEATHER", name: "天气" },
  { id: "GAME", name: "游戏" },
  { id: "GAME_ACTION", name: "动作游戏" },
  { id: "GAME_ADVENTURE", name: "冒险游戏" },
  { id: "GAME_ARCADE", name: "街机游戏" },
  { id: "GAME_BOARD", name: "棋类游戏" },
  { id: "GAME_CARD", name: "卡牌游戏" },
  { id: "GAME_CASINO", name: "博彩游戏" },
  { id: "GAME_CASUAL", name: "休闲游戏" },
  { id: "GAME_EDUCATIONAL", name: "教育游戏" },
  { id: "GAME_MUSIC", name: "音乐游戏" },
  { id: "GAME_PUZZLE", name: "解谜游戏" },
  { id: "GAME_RACING", name: "竞速游戏" },
  { id: "GAME_ROLE_PLAYING", name: "角色扮演" },
  { id: "GAME_SIMULATION", name: "模拟游戏" },
  { id: "GAME_SPORTS", name: "体育游戏" },
  { id: "GAME_STRATEGY", name: "策略游戏" },
  { id: "GAME_TRIVIA", name: "问答游戏" },
  { id: "GAME_WORD", name: "文字游戏" },
  { id: "FAMILY", name: "亲子" },
];
