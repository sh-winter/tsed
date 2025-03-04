import {Adapter, Adapters, FileSyncAdapter} from "@tsed/adapters";
import {PlatformTest} from "@tsed/common";
import {Property} from "@tsed/schema";
import faker from "@faker-js/faker";

class Client {
  @Property()
  _id: string;

  @Property()
  name: string;
}

describe("FileSyncAdapter", () => {
  describe("writable", () => {
    let adapter: Adapter<Client>;
    beforeEach(() => PlatformTest.create());
    afterEach(() => PlatformTest.reset());
    beforeEach(() => {
      adapter = PlatformTest.get<Adapters>(Adapters).invokeAdapter<any>({
        collectionName: "clients",
        model: Client,
        adapter: FileSyncAdapter
      });
    });

    afterAll(async () => {
      await adapter.deleteMany({});
    });

    describe("create()", () => {
      it("should create a new instance", async () => {
        const base = {
          name: faker.name.title()
        };

        const client = await adapter.create(base);

        expect(client).toBeInstanceOf(Client);
        expect(typeof client._id).toBe("string");
        expect(client.name).toBe(base.name);
      });
    });

    describe("findById()", () => {
      it("should create a new instance", async () => {
        const base = {
          name: faker.name.title()
        };

        const client = await adapter.create(base);
        const result = await adapter.findById(client._id);

        expect(result).toBeInstanceOf(Client);
        expect(result?._id).toBe(client._id);
        expect(result?.name).toBe(base.name);
      });
    });

    describe("findOne()", () => {
      it("should create a new instance", async () => {
        const base = {
          name: faker.name.title()
        };

        const client = await adapter.create(base);

        const result = await adapter.findOne({
          name: base.name
        });

        expect(result).toBeInstanceOf(Client);
        expect(result?._id).toBe(client._id);
        expect(result?.name).toBe(base.name);
      });
    });
  });
  describe("readOnly", () => {
    let adapter: Adapter<Client>;
    beforeEach(() => PlatformTest.create());
    afterEach(() => PlatformTest.reset());
    beforeEach(() => {
      adapter = PlatformTest.get<Adapters>(Adapters).invokeAdapter<any>({
        collectionName: "clients",
        model: Client,
        readOnly: true,
        adapter: FileSyncAdapter
      });
    });

    afterAll(async () => {
      await adapter.deleteMany({});
    });

    describe("create()", () => {
      it("should create a new instance", async () => {
        const base = {
          name: faker.name.title()
        };

        const client = await adapter.create(base);

        expect(client).toBeInstanceOf(Client);
        expect(typeof client._id).toBe("string");
        expect(client.name).toBe(base.name);
      });
    });

    describe("findById()", () => {
      it("should create a new instance", async () => {
        const base = {
          name: faker.name.title()
        };

        const client = await adapter.create(base);
        const result = await adapter.findById(client._id);

        expect(result).toBeInstanceOf(Client);
        expect(result?._id).toBe(client._id);
        expect(result?.name).toBe(base.name);
      });
    });

    describe("findOne()", () => {
      it("should create a new instance", async () => {
        const base = {
          name: faker.name.title()
        };

        const client = await adapter.create(base);

        const result = await adapter.findOne({
          name: base.name
        });

        expect(result).toBeInstanceOf(Client);
        expect(result?._id).toBe(client._id);
        expect(result?.name).toBe(base.name);
      });
    });
  });
});
