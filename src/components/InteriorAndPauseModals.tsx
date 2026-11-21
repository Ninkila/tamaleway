import React from "react";
import {
  BookOpen,
  FolderOpen,
  Gamepad2,
  Home,
  Package,
  Play,
  Save,
  Settings,
  Users,
  X,
} from "lucide-react";
import { LandmarkData } from "../types/game";
import { DeviceLayoutConfig } from "../utils/deviceProfile";

interface BuildingInteriorModalProps {
  landmark: LandmarkData;
  onClose: () => void;
  onOpenShop?: (shopId: string) => void;
  onOpenDagbaniGuide: () => void;
}

export const BuildingInteriorModal: React.FC<BuildingInteriorModalProps> = ({
  landmark,
  onClose,
  onOpenShop,
  onOpenDagbaniGuide,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-4">
      <div className="w-full max-w-xl max-h-[90dvh] overflow-y-auto bg-[#171411] border border-white/15 rounded-2xl shadow-2xl">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-amber-400 font-medium">
              {landmark.district} · {landmark.dagbaniLabel}
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#f8f5ef]">
              {landmark.interiorTitle || landmark.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close building interior"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#bfb7aa] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-[#dfd8cd] leading-relaxed">
            {landmark.interiorDescription}
          </p>
          <div className="text-xs text-[#9c9487] bg-[#201b17] border border-white/10 rounded-xl p-3">
            {landmark.authenticityNote}
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {landmark.shopId && onOpenShop && (
              <button
                type="button"
                onClick={() => onOpenShop(landmark.shopId!)}
                className="min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-semibold text-sm rounded-xl transition-colors whitespace-nowrap cursor-pointer"
              >
                {landmark.shopId === "cultural_crafts"
                  ? "Visit Smock & Craft Guild"
                  : landmark.shopId === "kukuo_pottery"
                  ? "Browse Kukuo Pottery"
                  : landmark.shopId === "lamashegu_parts" ||
                    landmark.shopId === "lamashegu_market_hub"
                  ? "Open Parts & Mechanic Bay"
                  : landmark.shopId === "nightlife_grill_lounge" ||
                    landmark.shopId === "choggu_night_spot" ||
                    landmark.shopId === "aboabo_tz_kitchen"
                  ? "Order Waakye, Tuo Zaafi & Grill"
                  : landmark.shopId === "savannah_fast_food" ||
                    landmark.shopId === "vittin_pizza_grill"
                  ? "Order Fast Food & Grill"
                  : landmark.shopId === "tamale_supermarket"
                  ? "Shop Supermarket Aisles"
                  : landmark.shopId === "kalpohin_juice_bakery"
                  ? "Order Fresh Juice & Pastries"
                  : landmark.shopId === "nyohini_barber_salon"
                  ? "Book Haircut / Braids"
                  : landmark.shopId === "jakarayili_guesthouse"
                  ? "Book Guest Room & Rest"
                  : landmark.shopId === "dabokpaa_fitness_cafe"
                  ? "Gym Workout & Print Desk"
                  : landmark.shopId === "tishigu_pharmacy_bakery"
                  ? "Pharmacy & Sugar Bread"
                  : landmark.shopId === "kalpohin_hardware_carpentry"
                  ? "Browse Timber & Tools"
                  : landmark.shopId === "dungu_student_hub"
                  ? "Campus Café, Printing & Waakye"
                  : landmark.shopId === "tamale_enterprise_bank"
                  ? "Bank Desk & MoMo Services"
                  : landmark.shopId === "gbewaa_electronics_hub"
                  ? "Shop Phones, Solar & Repairs"
                  : landmark.shopId === "tamale_ice_cream_bar"
                  ? "Order Ice Cream & Smoothies"
                  : landmark.shopId === "savannah_fashion_boutique"
                  ? "Browse Fashion & Cosmetics"
                  : landmark.shopId === "tamale_footwear_leather"
                  ? "Shop Footwear & Leather Bags"
                  : landmark.shopId === "gukpegu_jollof_tilapia"
                  ? "Order Grilled Tilapia, Banku & Jollof"
                  : landmark.shopId === "dabokpaa_household_mart"
                  ? "Shop Household & Mini-Mart"
                  : "Browse Market & Goods"}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenDagbaniGuide}
              className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 bg-[#26201b] hover:bg-[#322b24] text-[#f5f2eb] border border-white/10 text-sm font-medium rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Study Cultural Vocabulary</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-sm text-[#cfc8bc] hover:text-white cursor-pointer"
            >
              Step Back Outside
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  deviceLayout?: DeviceLayoutConfig;
  hasSavedGame: boolean;
  onResume: () => void;
  onSaveGame: () => void;
  onLoadGame: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  onOpenBag?: () => void;
  onOpenCharacterSwitch?: () => void;
  onOpenDagbaniGuide?: () => void;
  onReturnMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  deviceLayout,
  hasSavedGame,
  onResume,
  onSaveGame,
  onLoadGame,
  onOpenSettings,
  onOpenControls,
  onOpenBag,
  onOpenCharacterSwitch,
  onOpenDagbaniGuide,
  onReturnMainMenu,
}) => {
  const isPhone = deviceLayout?.isPhoneLayout ?? false;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-4">
      <div
        className={`w-full ${
          isPhone ? "max-w-sm" : "max-w-md"
        } max-h-[92dvh] overflow-y-auto bg-[#171411] border border-white/15 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-amber-400">Game Paused</div>
            <h2 className="font-display text-xl font-bold text-[#f8f5ef]">Tamale 3D Menu</h2>
          </div>
          <button
            type="button"
            onClick={onResume}
            aria-label="Resume game"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#bfb7aa] hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="min-h-[48px] w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-[#12100e] font-bold text-sm rounded-xl flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onSaveGame}
              className="min-h-[46px] py-2.5 px-3 bg-[#241f1a] hover:bg-[#302922] text-[#f5f2eb] border border-white/10 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400 shrink-0" />
              <span>SAVE GAME</span>
            </button>

            <button
              type="button"
              onClick={onLoadGame}
              className={`min-h-[46px] py-2.5 px-3 border font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                hasSavedGame
                  ? "bg-[#241f1a] hover:bg-[#302922] text-[#f5f2eb] border-white/10"
                  : "bg-[#1b1714] hover:bg-[#241f1a] text-[#9c9487] border-white/10"
              }`}
            >
              <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <span>LOAD GAME</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenSettings}
              className="min-h-[46px] py-2.5 px-3 bg-[#241f1a] hover:bg-[#302922] text-[#f5f2eb] border border-white/10 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-400 shrink-0" />
              <span>SETTINGS</span>
            </button>

            <button
              type="button"
              onClick={onOpenControls}
              className="min-h-[46px] py-2.5 px-3 bg-[#241f1a] hover:bg-[#302922] text-[#f5f2eb] border border-white/10 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>CONTROLS</span>
            </button>
          </div>

          {(onOpenBag || onOpenCharacterSwitch || onOpenDagbaniGuide) && (
            <div className="grid grid-cols-3 gap-2">
              {onOpenBag && (
                <button
                  type="button"
                  onClick={onOpenBag}
                  className="min-h-[42px] px-2 py-1.5 bg-[#201b17] hover:bg-white/10 text-[#e8e2d7] border border-white/10 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Bag</span>
                </button>
              )}
              {onOpenCharacterSwitch && (
                <button
                  type="button"
                  onClick={onOpenCharacterSwitch}
                  className="min-h-[42px] px-2 py-1.5 bg-[#201b17] hover:bg-white/10 text-[#e8e2d7] border border-white/10 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Switch</span>
                </button>
              )}
              {onOpenDagbaniGuide && (
                <button
                  type="button"
                  onClick={onOpenDagbaniGuide}
                  className="min-h-[42px] px-2 py-1.5 bg-[#201b17] hover:bg-white/10 text-[#e8e2d7] border border-white/10 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Dagbani</span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onReturnMainMenu}
            className="min-h-[44px] w-full py-2.5 bg-[#1c1714] hover:bg-white/10 text-[#dfd8cd] border border-white/10 font-medium text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
