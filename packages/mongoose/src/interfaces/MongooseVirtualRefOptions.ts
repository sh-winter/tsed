import {Type} from "@tsed/core";

export interface MongooseVirtualRefOptions {
  type: string | Type<any> | (() => Type<any>);
  foreignField: string;
  localField?: string;
  justOne?: boolean;
  options?: object;
}
