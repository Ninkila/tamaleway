#include "Player/TamalePlayerController.h"
#include "Blueprint/UserWidget.h"
#include "Core/TamaleGameInstance.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputAction.h"
#include "InputCoreTypes.h"
#include "InputMappingContext.h"
#include "InputModifiers.h"
#include "Interaction/TamaleInteractionComponent.h"
#include "Player/TamalePlayerCharacter.h"
#include "Tamale3D.h"
#include "UI/TamaleHUD.h"
#include "UI/TamaleHudWidget.h"

namespace TamaleInputDefaults
{
    static UInputAction* MakeAction(UObject* Outer, const TCHAR* Name, EInputActionValueType Type, bool bTriggerWhenPaused = false)
    {
        UInputAction* Action = NewObject<UInputAction>(Outer, FName(Name));
        Action->ValueType = Type;
        Action->bTriggerWhenPaused = bTriggerWhenPaused;
        return Action;
    }

    template <typename ModifierType>
    static ModifierType* AddModifier(UObject* Outer, FEnhancedActionKeyMapping& Mapping)
    {
        ModifierType* Modifier = NewObject<ModifierType>(Outer);
        Mapping.Modifiers.Add(Modifier);
        return Modifier;
    }
}

void ATamalePlayerController::EnsureDefaultInputAssets()
{
    using namespace TamaleInputDefaults;

    TArray<UInputAction*> Created;
    auto Ensure = [this, &Created](TObjectPtr<UInputAction>& Slot, const TCHAR* Name, EInputActionValueType Type, bool bWhenPaused = false)
    {
        if (!Slot)
        {
            Slot = MakeAction(this, Name, Type, bWhenPaused);
            Created.Add(Slot);
        }
    };

    Ensure(MoveAction, TEXT("IA_Move"), EInputActionValueType::Axis2D);
    Ensure(LookAction, TEXT("IA_Look"), EInputActionValueType::Axis2D);
    Ensure(JumpAction, TEXT("IA_Jump"), EInputActionValueType::Boolean);
    Ensure(SprintAction, TEXT("IA_Sprint"), EInputActionValueType::Boolean);
    Ensure(CrouchAction, TEXT("IA_Crouch"), EInputActionValueType::Boolean);
    Ensure(CameraZoomAction, TEXT("IA_CameraZoom"), EInputActionValueType::Axis1D);
    Ensure(InteractAction, TEXT("IA_Interact"), EInputActionValueType::Boolean);
    Ensure(VehicleAction, TEXT("IA_Vehicle"), EInputActionValueType::Boolean);
    Ensure(MapAction, TEXT("IA_Map"), EInputActionValueType::Boolean);
    Ensure(InventoryAction, TEXT("IA_Inventory"), EInputActionValueType::Boolean);
    Ensure(HornAction, TEXT("IA_Horn"), EInputActionValueType::Boolean);
    Ensure(PauseAction, TEXT("IA_Pause"), EInputActionValueType::Boolean, true);
    Ensure(SwitchCharacterAction, TEXT("IA_SwitchCharacter"), EInputActionValueType::Axis1D);
    Ensure(QuickSaveAction, TEXT("IA_QuickSave"), EInputActionValueType::Boolean);
    Ensure(QuickLoadAction, TEXT("IA_QuickLoad"), EInputActionValueType::Boolean);

    if (Created.Num() == 0)
    {
        return; // everything was authored in the editor
    }

    // Default keys go into their own context so a designer IMC (if any) keeps priority.
    UInputMappingContext* Defaults = NewObject<UInputMappingContext>(this, TEXT("IMC_Tamale_RuntimeDefaults"));
    auto IsNew = [&Created](const TObjectPtr<UInputAction>& Action) { return Created.Contains(Action.Get()); };

    if (IsNew(MoveAction))
    {
        AddModifier<UInputModifierSwizzleAxis>(Defaults, Defaults->MapKey(MoveAction, EKeys::W));            // forward = +Y
        FEnhancedActionKeyMapping& Back = Defaults->MapKey(MoveAction, EKeys::S);
        AddModifier<UInputModifierSwizzleAxis>(Defaults, Back);
        AddModifier<UInputModifierNegate>(Defaults, Back);
        AddModifier<UInputModifierNegate>(Defaults, Defaults->MapKey(MoveAction, EKeys::A));               // left = -X
        Defaults->MapKey(MoveAction, EKeys::D);                                                            // right = +X
        Defaults->MapKey(MoveAction, EKeys::Gamepad_Left2D);                                               // ready for controllers
    }
    if (IsNew(LookAction))
    {
        UInputModifierNegate* InvertY = AddModifier<UInputModifierNegate>(Defaults, Defaults->MapKey(LookAction, EKeys::Mouse2D));
        InvertY->bX = false;
        InvertY->bZ = false;
        UInputModifierNegate* PadInvertY = AddModifier<UInputModifierNegate>(Defaults, Defaults->MapKey(LookAction, EKeys::Gamepad_Right2D));
        PadInvertY->bX = false;
        PadInvertY->bZ = false;
    }
    if (IsNew(JumpAction)) Defaults->MapKey(JumpAction, EKeys::SpaceBar);
    if (IsNew(SprintAction)) Defaults->MapKey(SprintAction, EKeys::LeftShift);
    if (IsNew(CrouchAction)) Defaults->MapKey(CrouchAction, EKeys::LeftControl);
    if (IsNew(CameraZoomAction)) Defaults->MapKey(CameraZoomAction, EKeys::MouseWheelAxis);
    if (IsNew(InteractAction)) Defaults->MapKey(InteractAction, EKeys::E);
    if (IsNew(VehicleAction)) Defaults->MapKey(VehicleAction, EKeys::F);
    if (IsNew(MapAction)) Defaults->MapKey(MapAction, EKeys::M);
    if (IsNew(InventoryAction)) Defaults->MapKey(InventoryAction, EKeys::I);
    if (IsNew(HornAction)) Defaults->MapKey(HornAction, EKeys::H);
    if (IsNew(PauseAction))
    {
        Defaults->MapKey(PauseAction, EKeys::Escape); // note: in Play-In-Editor, Esc ends the session - P also pauses
        Defaults->MapKey(PauseAction, EKeys::P);
    }
    if (IsNew(SwitchCharacterAction))
    {
        const FKey Digits[] = { EKeys::One, EKeys::Two, EKeys::Three, EKeys::Four, EKeys::Five, EKeys::Six };
        constexpr int32 DigitCount = UE_ARRAY_COUNT(Digits);
        for (int32 i = 0; i < DigitCount; ++i)
        {
            UInputModifierScalar* Scalar = AddModifier<UInputModifierScalar>(Defaults, Defaults->MapKey(SwitchCharacterAction, Digits[i]));
            Scalar->Scalar = FVector(static_cast<double>(i + 1));
        }
    }
    if (IsNew(QuickSaveAction)) Defaults->MapKey(QuickSaveAction, EKeys::F5);
    if (IsNew(QuickLoadAction)) Defaults->MapKey(QuickLoadAction, EKeys::F9);

    RuntimeDefaultContext = Defaults;
    UE_LOG(LogTamale3D, Log, TEXT("Created %d default input actions at runtime (no input assets assigned)."), Created.Num());
}

void ATamalePlayerController::BeginPlay()
{
    Super::BeginPlay();

    if (ULocalPlayer* LP = GetLocalPlayer())
    {
        if (UEnhancedInputLocalPlayerSubsystem* InputSys = LP->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
        {
            if (OnFootMappingContext)
            {
                InputSys->AddMappingContext(OnFootMappingContext, 1);
            }
            if (RuntimeDefaultContext)
            {
                InputSys->AddMappingContext(RuntimeDefaultContext, 0);
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
            // The UMG HUD replaces the canvas status panels; map/pause overlays stay on the canvas HUD.
            if (ATamaleHUD* CanvasHud = GetTamaleCanvasHud())
            {
                CanvasHud->bDrawStatusPanels = false;
            }
        }
    }

    Toast(TEXT("Welcome to Tamale - press P for controls"));
}

void ATamalePlayerController::SetupInputComponent()
{
    Super::SetupInputComponent();
    EnsureDefaultInputAssets();

    UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(InputComponent);
    if (!EIC)
    {
        UE_LOG(LogTamale3D, Error, TEXT("InputComponent is not an EnhancedInputComponent - check Config/DefaultInput.ini"));
        return;
    }

    EIC->BindAction(MoveAction, ETriggerEvent::Triggered, this, &ATamalePlayerController::OnMove);
    EIC->BindAction(LookAction, ETriggerEvent::Triggered, this, &ATamalePlayerController::OnLook);
    EIC->BindAction(JumpAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnJumpStart);
    EIC->BindAction(JumpAction, ETriggerEvent::Completed, this, &ATamalePlayerController::OnJumpStop);
    EIC->BindAction(SprintAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnSprintStart);
    EIC->BindAction(SprintAction, ETriggerEvent::Completed, this, &ATamalePlayerController::OnSprintStop);
    EIC->BindAction(CrouchAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnCrouchToggle);
    EIC->BindAction(CameraZoomAction, ETriggerEvent::Triggered, this, &ATamalePlayerController::OnZoom);
    EIC->BindAction(InteractAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnInteract);
    EIC->BindAction(VehicleAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnVehicle);
    EIC->BindAction(MapAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnMap);
    EIC->BindAction(InventoryAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnInventory);
    EIC->BindAction(HornAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnHorn);
    EIC->BindAction(PauseAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnPause);
    EIC->BindAction(SwitchCharacterAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnSwitchCharacter);
    EIC->BindAction(QuickSaveAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnQuickSave);
    EIC->BindAction(QuickLoadAction, ETriggerEvent::Started, this, &ATamalePlayerController::OnQuickLoad);
}

// ---------------------------------------------------------------------------------------------

ATamaleHUD* ATamalePlayerController::GetTamaleCanvasHud() const
{
    return Cast<ATamaleHUD>(GetHUD());
}

void ATamalePlayerController::Toast(const FString& Message) const
{
    if (ATamaleHUD* Hud = GetTamaleCanvasHud())
    {
        Hud->ShowToast(Message);
    }
    UE_LOG(LogTamale3D, Log, TEXT("[Toast] %s"), *Message);
}

bool ATamalePlayerController::SwitchToCharacterIndex(int32 Index)
{
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    if (!GI)
    {
        return false;
    }
    const TArray<FName> Ids = GI->GetPlayableCharacterIds();
    if (!Ids.IsValidIndex(Index))
    {
        return false;
    }
    if (Ids[Index] == GI->GetActiveCharacterId())
    {
        Toast(TEXT("Already playing this character"));
        return true;
    }
    const bool bOk = GI->SwitchPlayableCharacter(Ids[Index]); // pawn listens and loads the new character's state
    if (bOk)
    {
        if (const FTamaleCharacterSaveState* State = GI->FindCharacterState(Ids[Index]))
        {
            Toast(FString::Printf(TEXT("Now playing %s"), *State->DisplayName));
        }
    }
    return bOk;
}

bool ATamalePlayerController::QuickSave()
{
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    const bool bOk = GI && GI->SaveCurrentGame();
    Toast(bOk ? TEXT("Game saved") : TEXT("Save failed - see Output Log"));
    return bOk;
}

bool ATamalePlayerController::QuickLoad()
{
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    const bool bOk = GI && GI->LoadSavedGame(); // broadcasts the active character -> pawn reloads + teleports
    Toast(bOk ? TEXT("Game loaded") : TEXT("No saved game found"));
    return bOk;
}

void ATamalePlayerController::TogglePauseMenu()
{
    const bool bNewPaused = !IsPaused();
    SetPause(bNewPaused);
    if (ATamaleHUD* Hud = GetTamaleCanvasHud())
    {
        Hud->SetPausedOverlay(bNewPaused);
    }
}

// ---------------------------------------------------------------------------------------------

void ATamalePlayerController::OnMove(const FInputActionValue& Value)
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn())) Char->HandleMoveInput(Value);
}

void ATamalePlayerController::OnLook(const FInputActionValue& Value)
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn())) Char->HandleLookInput(Value);
}

void ATamalePlayerController::OnJumpStart()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn())) Char->Jump();
}

void ATamalePlayerController::OnJumpStop()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn())) Char->StopJumping();
}

void ATamalePlayerController::OnSprintStart()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn())) Char->HandleSprintStarted();
}

void ATamalePlayerController::OnSprintStop()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn())) Char->HandleSprintStopped();
}

void ATamalePlayerController::OnCrouchToggle()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn())) Char->HandleToggleCrouch();
}

void ATamalePlayerController::OnZoom(const FInputActionValue& Value)
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn())) Char->HandleCameraZoom(Value);
}

void ATamalePlayerController::OnInteract()
{
    if (ATamalePlayerCharacter* Char = Cast<ATamalePlayerCharacter>(GetPawn())) Char->HandleInteractPressed();
}

void ATamalePlayerController::OnVehicle()
{
    Toast(TEXT("Vehicles are not migrated yet (Batch 5)"));
}

void ATamalePlayerController::OnHorn()
{
    Toast(TEXT("Horn works once vehicles are migrated (Batch 5)"));
}

void ATamalePlayerController::OnMap()
{
    if (ATamaleHUD* Hud = GetTamaleCanvasHud()) Hud->ToggleMap();
}

void ATamalePlayerController::OnInventory()
{
    if (ATamaleHUD* Hud = GetTamaleCanvasHud()) Hud->ToggleInventory();
}

void ATamalePlayerController::OnPause()
{
    TogglePauseMenu();
}

void ATamalePlayerController::OnSwitchCharacter(const FInputActionValue& Value)
{
    const int32 Number = FMath::RoundToInt(Value.Get<float>());
    if (Number >= 1)
    {
        SwitchToCharacterIndex(Number - 1);
    }
}

void ATamalePlayerController::OnQuickSave()
{
    QuickSave();
}

void ATamalePlayerController::OnQuickLoad()
{
    QuickLoad();
}
