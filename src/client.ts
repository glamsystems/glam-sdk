import { GlamClientConfig } from "./clientConfig";
import { BaseClient } from "./client/base";
import { DriftClient, DriftVaultsClient } from "./client/drift";
import { JupiterSwapClient } from "./client/jupiter";
import { JupiterVoteClient } from "./client/jupiter";
import { MarinadeClient } from "./client/marinade";
import { VaultClient } from "./client/vault";
import { StakingClient } from "./client/staking";
import { StateClient } from "./client/state";
import { MintClient } from "./client/mint";
import {
  KaminoFarmClient,
  KaminoLendingClient,
  KaminoVaultsClient,
} from "./client/kamino";
import { MeteoraDlmmClient } from "./client/meteora";
import { InvestClient } from "./client/invest";
import { PriceClient } from "./client/price";
import { ValidatorClient } from "./client/validator";
import { FeesClient } from "./client/fees";

/**
 * Main entrypoint for the GLAM SDK
 *
 * Lazy loads each client/module at first use
 */
export class GlamClient extends BaseClient {
  private _drift?: DriftClient;
  private _driftVaults?: DriftVaultsClient;
  private _invest?: InvestClient;
  private _jupiterSwap?: JupiterSwapClient;
  private _jupiterVote?: JupiterVoteClient;
  private _marinade?: MarinadeClient;
  private _vault?: VaultClient;
  private _price?: PriceClient;
  private _staking?: StakingClient;
  private _state?: StateClient;
  private _mint?: MintClient;
  private _kaminoLending?: KaminoLendingClient;
  private _kaminoFarm?: KaminoFarmClient;
  private _kaminoVaults?: KaminoVaultsClient;
  private _meteoraDlmm?: MeteoraDlmmClient;
  private _validator?: ValidatorClient;
  private _fees?: FeesClient;

  public constructor(config?: GlamClientConfig) {
    super(config);
  }

  get drift(): DriftClient {
    if (!this._drift) {
      this._drift = new DriftClient(this);
    }
    return this._drift;
  }

  get driftVaults(): DriftVaultsClient {
    if (!this._driftVaults) {
      this._driftVaults = new DriftVaultsClient(this, this.drift);
    }
    return this._driftVaults;
  }

  get invest(): InvestClient {
    if (!this._invest) {
      this._invest = new InvestClient(this);
    }
    return this._invest;
  }

  get fees(): FeesClient {
    if (!this._fees) {
      this._fees = new FeesClient(this, this.price);
    }
    return this._fees;
  }

  get jupiterSwap(): JupiterSwapClient {
    if (!this._jupiterSwap) {
      this._jupiterSwap = new JupiterSwapClient(this);
    }
    return this._jupiterSwap;
  }

  get jupiterVote(): JupiterVoteClient {
    if (!this._jupiterVote) {
      this._jupiterVote = new JupiterVoteClient(this);
    }
    return this._jupiterVote;
  }

  get marinade(): MarinadeClient {
    if (!this._marinade) {
      this._marinade = new MarinadeClient(this);
    }
    return this._marinade;
  }

  get vault(): VaultClient {
    if (!this._vault) {
      this._vault = new VaultClient(this);
    }
    return this._vault;
  }

  get staking(): StakingClient {
    if (!this._staking) {
      this._staking = new StakingClient(this, this.marinade);
    }
    return this._staking;
  }

  get price(): PriceClient {
    if (!this._price) {
      this._price = new PriceClient(
        this,
        this.kaminoLending,
        this.kaminoVaults,
        this.drift,
        this.driftVaults,
      );
    }
    return this._price;
  }

  get state(): StateClient {
    if (!this._state) {
      this._state = new StateClient(this);
    }
    return this._state;
  }

  get mint(): MintClient {
    if (!this._mint) {
      this._mint = new MintClient(this);
    }
    return this._mint;
  }

  get kaminoLending(): KaminoLendingClient {
    if (!this._kaminoLending) {
      this._kaminoLending = new KaminoLendingClient(this);
    }
    return this._kaminoLending;
  }

  get kaminoFarm(): KaminoFarmClient {
    if (!this._kaminoFarm) {
      this._kaminoFarm = new KaminoFarmClient(this);
    }
    return this._kaminoFarm;
  }

  get kaminoVaults(): KaminoVaultsClient {
    if (!this._kaminoVaults) {
      this._kaminoVaults = new KaminoVaultsClient(this, this.kaminoLending);
    }
    return this._kaminoVaults;
  }

  get meteoraDlmm(): MeteoraDlmmClient {
    if (!this._meteoraDlmm) {
      this._meteoraDlmm = new MeteoraDlmmClient(this);
    }
    return this._meteoraDlmm;
  }

  get validator(): ValidatorClient {
    if (!this._validator) {
      this._validator = new ValidatorClient(this);
    }
    return this._validator;
  }
}
