import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  authMockFactory,
  flushAsync,
  utilsMockFactory,
} from "./ClanModalTestUtils";

vi.mock("../../../src/client/Api", () => ({
  getAudience: vi.fn(() => "openfront.dev"),
}));
vi.mock("../../../src/client/Auth", () => authMockFactory());
vi.mock("../../../src/client/Utils", () => utilsMockFactory());

import { getAudience } from "../../../src/client/Api";
import {
  ClanMapView,
  clanMapOrigin,
} from "../../../src/client/components/clan/ClanMapView";

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const MAP_ORIGIN = "https://clanmap.openfront.dev";

describe("clanMapOrigin", () => {
  it("targets the clanmap subdomain of the audience", () => {
    expect(clanMapOrigin()).toBe(MAP_ORIGIN);
  });

  it("targets the local worker in the localhost audience", () => {
    asMock(getAudience).mockReturnValueOnce("localhost");
    expect(clanMapOrigin()).toBe("http://clanmap.localhost:8787");
  });
});

describe("ClanMapView", () => {
  let view: ClanMapView;

  beforeEach(async () => {
    if (!customElements.get("clan-map-view")) {
      customElements.define("clan-map-view", ClanMapView);
    }
    view = document.createElement("clan-map-view") as ClanMapView;
    document.body.appendChild(view);
    await flushAsync(view);
  });

  afterEach(() => {
    view.remove();
    vi.clearAllMocks();
  });

  it("renders the tactical map header and title", () => {
    expect(view.textContent).toContain("CARTE TACTIQUE DES CONQUÊTES");
  });

  it("renders tactical sectors and dossier details", () => {
    expect(view.textContent).toContain("EUR-01");
    expect(view.textContent).toContain("Europe Occidentale");
  });

  it("calls requestFullscreen on enterFullscreen", () => {
    const request = vi.fn(() => Promise.resolve());
    view.requestFullscreen = request as never;

    view.enterFullscreen();

    expect(request).toHaveBeenCalledTimes(1);
  });
});
