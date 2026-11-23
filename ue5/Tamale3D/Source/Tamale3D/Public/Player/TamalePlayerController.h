#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "InputActionValue.h"
#include "TamalePlayerController.generated.h"

class UInputMappingContext;
class UInputAction;
class UTamaleHudWidget;
class ATamaleHUD;

/**
 * Binds UE5 Enhanced Input actions to ATamalePlayerCharacter and manages HUD lifecycle.
 *
 * Any input asset left unassigned is created at runtime with the TAMALE 3D PC layout
 * (WASD, mouse, Shift run, Space jump, Ctrl crouch, E interact, F vehicle, M map, I inventory,
 * H horn, Esc/P pause, 1-6 switch character, F5 save, F9 load), so the game is controllable
 * without authoring IMC/IA assets. Assign designer assets in a Blueprint subclass to override.
 */
UCLASS()
class TAMALE3D_API ATamalePlayerController : public APlayerController
{
    GENERATED_BODY()

public:
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputMappingContext> OnFootMappingContext;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> MoveAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> LookAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> JumpAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> SprintAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> CrouchAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> CameraZoomAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> InteractAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> VehicleAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> MapAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> InventoryAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> HornAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> PauseAction;

    /** Axis1D: keys 1..6 produce values 1..6 (Scalar modifier) -> playable character index. */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> SwitchCharacterAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> QuickSaveAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
    TObjectPtr<UInputAction> QuickLoadAction;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "UI")
    TSubclassOf<UTamaleHudWidget> HudWidgetClass;

    UFUNCTION(BlueprintPure, Category = "UI")
    UTamaleHudWidget* GetTamaleHud() const { return HudWidgetInstance; }

    /** Switches to the Nth playable character (0-based, data order). */
    UFUNCTION(BlueprintCallable, Category = "Character")
    bool SwitchToCharacterIndex(int32 Index);

    UFUNCTION(BlueprintCallable, Category = "Save")
    bool QuickSave();

    UFUNCTION(BlueprintCallable, Category = "Save")
    bool QuickLoad();

    UFUNCTION(BlueprintCallable, Category = "UI")
    void TogglePauseMenu();

protected:
    virtual void BeginPlay() override;
    virtual void SetupInputComponent() override;

private:
    UPROPERTY()
    TObjectPtr<UTamaleHudWidget> HudWidgetInstance;

    /** Mapping context generated for actions that had no assigned asset. */
    UPROPERTY(Transient)
    TObjectPtr<UInputMappingContext> RuntimeDefaultContext;

    /** Creates any unassigned input action / mapping context with the default PC layout. */
    void EnsureDefaultInputAssets();

    ATamaleHUD* GetTamaleCanvasHud() const;
    void Toast(const FString& Message) const;

    void OnMove(const FInputActionValue& Value);
    void OnLook(const FInputActionValue& Value);
    void OnJumpStart();
    void OnJumpStop();
    void OnSprintStart();
    void OnSprintStop();
    void OnCrouchToggle();
    void OnZoom(const FInputActionValue& Value);
    void OnInteract();
    void OnVehicle();
    void OnMap();
    void OnInventory();
    void OnHorn();
    void OnPause();
    void OnSwitchCharacter(const FInputActionValue& Value);
    void OnQuickSave();
    void OnQuickLoad();
};
