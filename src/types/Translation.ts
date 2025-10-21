import type { TranslationDictionary } from "../translation/en";

export interface Translation {
  flag: string;
  code: string[];
  dictionary: TranslationDictionary;
}
