#include "Player/TamalePlayerController.h"
#include "Blueprint/UserWidget.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Interaction/TamaleInteractionComponent.h"
#include "Player/TamalePlayerCharacter.h"
#include "UI/TamaleHudWidget.h"

void ATamalePlayerController::BeginPlay()
{
    Super::BeginPlay();

    if (ULocalPlayer* LP = GetLocalPlayer())
    {
        if (UEnhancedInputLocalPlayerSubsystem* InputSys = LP->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
        {
            if (OnFootMappingContext)
            {
                InputSys->AddMappingContext(OnFootMappingContext, 0);
            }
        }
    }

    if (HudWidgetClass)
    {
        HudWidgetInstance = CreateWidget<UTamaleHudWidget>(this, HudWidgetClass);
        if (HudWidgetInstance)
        {
            HudWidgetInstance->AddToViewport(0);
            if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
            {
                HudWidgetInstance->BindToPlayer(Char);
            }
        }
    }
}

void ATamalePlayerController::SetupInputComponent()
{
    Super::SetupInputComponent();

    UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(InputComponent);
    if (!EIC) return;

    if (MoveAction)
    {
        EIC->BindAction(MoveAction, ETriggerEvent::Triggered, this, &ATamalePlayerController::OnMove);
    }
    if (LookAction)
    {
        EIC->BindAction(LookAction, ETriggerEvent::Triggered, this, &ATamalePlayerController::OnLook);
    }
    if (JumpAction)
    {
        EIC->BindAction(JumpAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnJumpStart);
        EIC->BindAction(JumpAction, ETriggerEvent::Completed, this, &ATamalePlayerController::OnJumpStop);
    }
    if (SprintAction)
    {
        EIC->BindAction(SprintAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnSprintStart);
        EIC->BindAction(SprintAction, ETriggerEvent::Completed, this, &ATamalePlayerController::OnSprintStop);
    }
    if (CrouchAction)
    {
        EIC->BindAction(CrouchAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnCrouchToggle);
    }
    if (CameraZoomAction)
    {
        EIC->BindAction(CameraZoomAction, ETriggerEvent::Triggered, this, &ATamalePlayerController::OnZoom);
    }
    if (InteractAction)
    {
        EIC->BindAction(InteractAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnInteract);
    }
}

void ATamalePlayerController::OnMove(const FInputActionValue& Value)
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
    {
        Char->HandleMoveInput(Value);
    }
}

void ATamalePlayerController::OnLook(const FInputActionValue& Value)
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
    {
        Char->HandleLookInput(Value);
    }
}

void ATamalePlayerController::OnJumpStart()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
    {
        Char->Jump();
    }
}

void ATamalePlayerController::OnJumpStop()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
    {
        Char->StopJumping();
    }
}

void ATamalePlayerController::OnSprintStart()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
    {
        Char->HandleSprintStarted();
    }
}

void ATamalePlayerController::OnSprintStop()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
    {
        Char->HandleSprintStopped();
    }
}

void ATamalePlayerController::OnCrouchToggle()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
    {
        Char->HandleToggleCrouch();
    }
}

void ATamalePlayerController::OnZoom(const FInputActionValue& Value)
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
    {
        Char->HandleCameraZoom(Value);
    }
}

void ATamalePlayerController::OnInteract()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn()))
    {
        Char->HandleInteractPressed();
    }
}
