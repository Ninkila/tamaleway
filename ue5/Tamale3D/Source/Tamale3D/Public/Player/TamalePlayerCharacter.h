#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "InputActionValue.h"
#include "TamalePlayerCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UTamaleNeedsComponent;
class UTamaleInteractionComponent;
class UStaticMeshComponent;
class UNavigationInvokerComponent;

/**
 * Grounded third-person citizen controller character for TAMALE 3D.
 * Handles walk, sprint, crouch, jump, camera zoom/orbit, and interaction triggers
 * using UE5 Enhanced Input and CharacterMovementComponent.
 */
UCLASS()
class TAMALE3D_API ATamalePlayerCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ATamalePlayerCharacter();

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    TObjectPtr<USpringArmComponent> CameraBoom;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    TObjectPtr<UCameraComponent> FollowCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "DailyLife")
    TObjectPtr<UTamaleNeedsComponent> NeedsComponent;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Interaction")
    TObjectPtr<UTamaleInteractionComponent> InteractionComponent;

    /** Builds navmesh tiles around the player at runtime so NPCs can path nearby (no hand-placed NavMeshBoundsVolume needed). */
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "AI")
    TObjectPtr<UNavigationInvokerComponent> NavigationInvoker;

    /** Stand-in body until a licensed skeletal mesh is assigned (then hidden automatically). */
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Placeholder")
    TObjectPtr<UStaticMeshComponent> PlaceholderBody;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Placeholder")
    TObjectPtr<UStaticMeshComponent> PlaceholderHead;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement")
    float WalkSpeedCmSec = 210.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement")
    float SprintSpeedCmSec = 470.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Camera")
    float MinCameraArmCm = 190.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Camera")
    float MaxCameraArmCm = 620.0f;

    void HandleMoveInput(const FInputActionValue& Value);
    void HandleLookInput(const FInputActionValue& Value);
    void HandleSprintStarted();
    void HandleSprintStopped();
    void HandleToggleCrouch();
    void HandleCameraZoom(const FInputActionValue& Value);
    void HandleInteractPressed();

    UFUNCTION(BlueprintCallable, Category = "Character")
    void SyncFromGameInstanceState();

    /** Loads the active character's needs/home state and, when bTeleport, moves to their saved location. */
    UFUNCTION(BlueprintCallable, Category = "Character")
    void ApplyActiveCharacterState(bool bTeleport);

    UFUNCTION(BlueprintCallable, Category = "Character")
    void SaveToGameInstanceState();

protected:
    virtual void BeginPlay() override;

    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    void ApplyPlaceholderColors();

    UFUNCTION()
    void HandleActiveCharacterSwitched(FName NewCharacterId);
};
