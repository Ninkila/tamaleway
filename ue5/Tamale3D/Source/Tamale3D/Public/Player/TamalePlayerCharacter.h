#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "InputActionValue.h"
#include "TamalePlayerCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UTamaleNeedsComponent;
class UTamaleInteractionComponent;

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

    UFUNCTION(BlueprintCallable, Category = "Character")
    void SaveToGameInstanceState();

protected:
    virtual void BeginPlay() override;
};
