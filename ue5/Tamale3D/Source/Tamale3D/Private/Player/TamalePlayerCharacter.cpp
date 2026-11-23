#include "Player/TamalePlayerCharacter.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Core/TamaleGameInstance.h"
#include "Data/TamaleDataRegistrySubsystem.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "NavigationInvokerComponent.h"
#include "UObject/ConstructorHelpers.h"
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

    NavigationInvoker = CreateDefaultSubobject<UNavigationInvokerComponent>(TEXT("NavigationInvoker"));
    NavigationInvoker->SetGenerationRadii(6000.0f, 7500.0f);

    // Placeholder body: ~1.72 m tall, feet on the capsule bottom (capsule half-height 90).
    static ConstructorHelpers::FObjectFinder<UStaticMesh> CylinderMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereMesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"));

    PlaceholderBody = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PlaceholderBody"));
    PlaceholderBody->SetupAttachment(GetCapsuleComponent());
    PlaceholderBody->SetStaticMesh(CylinderMesh.Object);
    PlaceholderBody->SetRelativeLocation(FVector(0.0f, 0.0f, -20.0f));
    PlaceholderBody->SetRelativeScale3D(FVector(0.55f, 0.42f, 1.4f));
    PlaceholderBody->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    PlaceholderBody->SetCanEverAffectNavigation(false);

    PlaceholderHead = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PlaceholderHead"));
    PlaceholderHead->SetupAttachment(GetCapsuleComponent());
    PlaceholderHead->SetStaticMesh(SphereMesh.Object);
    PlaceholderHead->SetRelativeLocation(FVector(6.0f, 0.0f, 66.0f));
    PlaceholderHead->SetRelativeScale3D(FVector(0.26f));
    PlaceholderHead->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    PlaceholderHead->SetCanEverAffectNavigation(false);
}

void ATamalePlayerCharacter::BeginPlay()
{
    Super::BeginPlay();

    const bool bHasRealMesh = GetMesh() && GetMesh()->GetSkeletalMeshAsset();
    if (PlaceholderBody) PlaceholderBody->SetHiddenInGame(bHasRealMesh);
    if (PlaceholderHead) PlaceholderHead->SetHiddenInGame(bHasRealMesh);

    if (UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance()))
    {
        GI->OnActiveCharacterSwitched.AddDynamic(this, &ATamalePlayerCharacter::HandleActiveCharacterSwitched);
    }
    SyncFromGameInstanceState();
}

void ATamalePlayerCharacter::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance()))
    {
        GI->OnActiveCharacterSwitched.RemoveDynamic(this, &ATamalePlayerCharacter::HandleActiveCharacterSwitched);
    }
    Super::EndPlay(EndPlayReason);
}

void ATamalePlayerCharacter::HandleActiveCharacterSwitched(FName NewCharacterId)
{
    ApplyActiveCharacterState(true);
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
    ApplyActiveCharacterState(false);
}

void ATamalePlayerCharacter::ApplyActiveCharacterState(bool bTeleport)
{
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    if (!GI)
    {
        return;
    }

    const FTamaleCharacterSaveState State = GI->GetActiveCharacterState();
    if (NeedsComponent)
    {
        NeedsComponent->LoadFromSaveState(State.Needs, State.HomeState);
    }

    if (bTeleport)
    {
        GetCharacterMovement()->StopMovementImmediately();
        if (bIsCrouched)
        {
            UnCrouch();
        }
        SetActorLocationAndRotation(State.SavedWorldLocation + FVector(0.0, 0.0, 10.0), FRotator(0.0f, State.SavedWorldRotation.Yaw, 0.0f),
                                    false, nullptr, ETeleportType::TeleportPhysics);
        if (Controller)
        {
            Controller->SetControlRotation(FRotator(-12.0f, State.SavedWorldRotation.Yaw, 0.0f));
        }
    }

    ApplyPlaceholderColors();
}

void ATamalePlayerCharacter::ApplyPlaceholderColors()
{
    if (!PlaceholderBody || (GetMesh() && GetMesh()->GetSkeletalMeshAsset()))
    {
        return; // a real character mesh is in use
    }

    FLinearColor Cloth(0.85f, 0.65f, 0.1f);
    FLinearColor Skin(0.36f, 0.22f, 0.14f);
    const UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    const UTamaleDataRegistrySubsystem* Data = GI ? GI->GetSubsystem<UTamaleDataRegistrySubsystem>() : nullptr;
    if (GI && Data)
    {
        if (const FTamalePlayableCharacterRow* Row = Data->FindPlayableCharacter(GI->GetActiveCharacterId().ToString()))
        {
            if (Row->PrimaryColorHex.StartsWith(TEXT("#")))
            {
                Cloth = FLinearColor::FromSRGBColor(FColor::FromHex(Row->PrimaryColorHex));
            }
        }
    }

    if (UMaterialInstanceDynamic* BodyMID = PlaceholderBody->CreateAndSetMaterialInstanceDynamic(0))
    {
        BodyMID->SetVectorParameterValue(TEXT("Color"), Cloth);
    }
    if (PlaceholderHead)
    {
        if (UMaterialInstanceDynamic* HeadMID = PlaceholderHead->CreateAndSetMaterialInstanceDynamic(0))
        {
            HeadMID->SetVectorParameterValue(TEXT("Color"), Skin);
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
