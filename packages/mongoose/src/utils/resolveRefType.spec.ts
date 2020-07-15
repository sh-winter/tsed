import {Store} from "@tsed/core";
import {expect} from "chai";
import {MONGOOSE_MODEL_NAME} from "../constants";
import {resolveRefType} from "./resolveRefType";

describe("resolveRefType", () => {
  it("should return type as string (from string)", () => {
    expect(resolveRefType("Test")).to.eq("Test");
  });
  it("should return type as string (from class)", () => {
    class Test {}

    Store.from(Test).set(MONGOOSE_MODEL_NAME, "Test");

    expect(resolveRefType(Test)).to.eq("Test");
  });

  it("should return type as string (from class)", () => {
    class Test {}

    Store.from(Test).set(MONGOOSE_MODEL_NAME, "Test");

    expect(resolveRefType(Test)).to.eq("Test");
  });

  it("should return type as string (from class without store)", () => {
    class Test {}

    expect(resolveRefType(Test)).to.eq("Test");
  });
  it("should return type as string (from arrow resolver)", () => {
    class Test {}

    Store.from(Test).set(MONGOOSE_MODEL_NAME, "Test");

    expect(resolveRefType(() => Test)).to.eq("Test");
  });
});
