#include "Player/TamalePlayerCharacter.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Core/TamaleGameInstance.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Interaction/TamaleInteractionComponent.h"
#include "Player/TamaleNeedsComponent.h"

ATamalePlayerCharacter::ATamalePlayerCharacter()
{
    PrimaryActorTick.bCanEverTick = false;

    // Grounded Tamale human proportions (~1.8m height, 34cm radius fits doorways cleanly)
    GetCapsuleComponent()->InitCapsuleSize(34.0f, 90.0f);

    bUseControllerRotationPitch = false;
    bUseControllerRotationYaw = false;
    bUseControllerRotationRoll = false;

    UCharacterMovementComponent* Move = GetCharacterMovement();
    Move->bOrientRotationToMovement = true;
    Move->RotationRate = FRotator(0.0f, 540.0f, 0.0f);
    Move->MaxWalkSpeed = WalkSpeedCmSec;
    Move->MaxWalkSpeedCrouched = 135.0f;
    Move->MaxStepHeight = 36.0f; // Handles compound thresholds and Tamale sidewalk curbs smoothly
    Move->SetWalkableFloorAngle(45.0f);
    Move->JumpZVelocity = 430.0f;
    Move->AirControl = 0.28f;
    Move->GroundFriction = 8.0f;
    Move->BrakingDecelerationWalking = 1800.0f;
    Move->NavAgentProps.bCanCrouch = true;

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 340.0f;
    CameraBoom->SocketOffset = FVector(0.0f, 42.0f, 52.0f);
    CameraBoom->ProbeSize = 14.0f;
    CameraBoom->bDoCollisionTest = true;
    CameraBoom->bUsePawnControlRotation = true;
    CameraBoom->bEnableCameraLag = true;
    CameraBoom->CameraLagSpeed = 12.0f;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;

    NeedsComponent = CreateDefaultSubobject<UTamaleNeedsComponent>(TEXT("NeedsComponent"));
    InteractionComponent = CreateDefaultSubobject<UTamaleInteractionComponent>(TEXT("InteractionComponent"));
}

void ATamalePlayerCharacter::BeginPlay()
{
    Super::BeginPlay();
    SyncFromGameInstanceState();
}

void ATamalePlayerCharacter::HandleMoveInput(const FInputActionValue& Value)
{
    const FVector2D Axis = Value.Get<FVector2D>();
    if (!Controller || Axis.IsNearlyZero()) return;

    const FRotator YawRot(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
    const FVector ForwardDir = FRotationMatrix(YawRot).GetUnitAxis(EAxis::X);
    const FVector RightDir = FRotationMatrix(YawRot).GetUnitAxis(EAxis::Y);

    AddMovementInput(ForwardDir, Axis.Y);
    AddMovementInput(RightDir, Axis.X);
}

void ATamalePlayerCharacter::HandleLookInput(const FInputActionValue& Value)
{
    const FVector2D Look = Value.Get<FVector2D>();
    if (!Controller) return;
    AddControllerYawInput(Look.X);
    AddControllerPitchInput(Look.Y);
}

void ATamalePlayerCharacter::HandleSprintStarted()
{
    if (NeedsComponent && NeedsComponent->Needs.Energy > 8.0f && !bIsCrouched)
    {
        GetCharacterMovement()->MaxWalkSpeed = SprintSpeedCmSec;
    }
}

void ATamalePlayerCharacter::HandleSprintStopped()
{
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeedCmSec;
}

void ATamalePlayerCharacter::HandleToggleCrouch()
{
    if (bIsCrouched)
    {
        UnCrouch();
    }
    else
    {
        HandleSprintStopped();
        Crouch();
    }
}

void ATamalePlayerCharacter::HandleCameraZoom(const FInputActionValue& Value)
{
    const float Wheel = Value.Get<float>();
    if (CameraBoom && !FMath::IsNearlyZero(Wheel))
    {
        CameraBoom->TargetArmLength = FMath::Clamp(
            CameraBoom->TargetArmLength - Wheel * 32.0f,
            MinCameraArmCm,
            MaxCameraArmCm
        );
    }
}

void ATamalePlayerCharacter::HandleInteractPressed()
{
    if (InteractionComponent)
    {
        InteractionComponent->TryInteract();
    }
}

void ATamalePlayerCharacter::SyncFromGameInstanceState()
{
    if (UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance()))
    {
        const FTamaleCharacterSaveState State = GI->GetActiveCharacterState();
        if (NeedsComponent)
        {
            NeedsComponent->LoadFromSaveState(State.Needs, State.HomeState);
        }
    }
}

void ATamalePlayerCharacter::SaveToGameInstanceState()
{
    if (UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance()))
    {
        FTamaleCharacterSaveState State = GI->GetActiveCharacterState();
        State.SavedWorldLocation = GetActorLocation();
        State.SavedWorldRotation = GetActorRotation();
        if (NeedsComponent)
        {
            State.Needs = NeedsComponent->Needs;
            State.HomeState = NeedsComponent->HomeState;
        }
        GI->UpdateActiveCharacterState(State);
    }
}
