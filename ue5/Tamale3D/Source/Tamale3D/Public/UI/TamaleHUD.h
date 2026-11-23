#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "TamaleHUD.generated.h"

class UFont;
class UTamaleDataRegistrySubsystem;

/**
 * Native canvas HUD for Batch 1: works with zero editor assets.
 * Shows clock/day/weather, active character + wallet, needs, district, the interaction prompt
 * (with Dagbani subtitle), a north-up minimap, the full city map (M), inventory (I), pause (Esc/P)
 * and short toast messages. Draws only from live gameplay state and the data registry.
 *
 * A designer-built UMG HUD (UTamaleHudWidget subclass set on the PlayerController) replaces
 * the status panels automatically; the map/pause overlays stay available.
 */
UCLASS()
class TAMALE3D_API ATamaleHUD : public AHUD
{
    GENERATED_BODY()

public:
    virtual void DrawHUD() override;

    UFUNCTION(BlueprintCallable, Category = "Tamale|HUD")
    void ToggleMap() { bShowMap = !bShowMap; if (bShowMap) bShowInventory = false; }

    UFUNCTION(BlueprintCallable, Category = "Tamale|HUD")
    void ToggleInventory() { bShowInventory = !bShowInventory; if (bShowInventory) bShowMap = false; }

    UFUNCTION(BlueprintCallable, Category = "Tamale|HUD")
    void SetPausedOverlay(bool bPaused) { bShowPause = bPaused; }

    UFUNCTION(BlueprintCallable, Category = "Tamale|HUD")
    void ShowToast(const FString& Message, float Seconds = 3.0f);

    UFUNCTION(BlueprintPure, Category = "Tamale|HUD")
    bool IsMapOpen() const { return bShowMap; }

    /** Hide the canvas status panels when a UMG HUD is in use. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tamale|HUD")
    bool bDrawStatusPanels = true;

    /** Minimap radius in world centimetres. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tamale|HUD")
    float MinimapRadiusCm = 9000.0f;

private:
    bool bShowMap = false;
    bool bShowInventory = false;
    bool bShowPause = false;

    FString ToastText;
    double ToastExpireTime = 0.0;

    float UiScale = 1.0f;

    void DrawPanel(float X, float Y, float W, float H, const FLinearColor& Color = FLinearColor(0.0f, 0.0f, 0.0f, 0.55f));
    void DrawLabel(const FString& Text, float X, float Y, UFont* Font, const FLinearColor& Color = FLinearColor::White, float Scale = 1.0f);
    float MeasureWidth(const FString& Text, UFont* Font, float Scale = 1.0f);

    void DrawStatus();
    void DrawNeeds();
    void DrawPrompt();
    void DrawMinimap();
    void DrawFullMap();
    void DrawInventory();
    void DrawPause();
    void DrawToast();
    void DrawDebugFooter();

    /** Draws roads/buildings/landmarks of the world box [WorldMin, WorldMax] into the screen rect. */
    void DrawWorldInRect(const UTamaleDataRegistrySubsystem& Data, const FVector2D& WorldCenter, double CmPerPixel,
                         float RectX, float RectY, float RectW, float RectH, bool bLandmarkNames);
};
