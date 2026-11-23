#include "UI/TamaleHUD.h"

#include "Core/TamaleGameInstance.h"
#include "Core/TamaleTimeOfDaySubsystem.h"
#include "Data/TamaleDataRegistrySubsystem.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Interaction/TamaleInteractableInterface.h"
#include "Interaction/TamaleInteractionComponent.h"
#include "Player/TamaleNeedsComponent.h"
#include "Player/TamalePlayerCharacter.h"

namespace TamaleHudStyle
{
    const FLinearColor Ink(0.96f, 0.94f, 0.88f);
    const FLinearColor Muted(0.72f, 0.69f, 0.62f);
    const FLinearColor Accent(1.0f, 0.74f, 0.25f);
    const FLinearColor Good(0.35f, 0.85f, 0.45f);
    const FLinearColor Warn(0.95f, 0.65f, 0.2f);
    const FLinearColor Bad(0.92f, 0.3f, 0.25f);
    const FLinearColor MapGround(0.30f, 0.17f, 0.10f, 0.92f);
    const FLinearColor MapRoad(0.12f, 0.12f, 0.13f, 1.0f);
    const FLinearColor MapLaterite(0.45f, 0.28f, 0.17f, 1.0f);
    const FLinearColor MapBuilding(0.78f, 0.66f, 0.50f, 1.0f);
    const FLinearColor MapLandmark(1.0f, 0.82f, 0.4f, 1.0f);
    const FLinearColor MapHome(0.35f, 1.0f, 0.55f, 1.0f);
    const FLinearColor MapPlayer(0.2f, 0.75f, 1.0f, 1.0f);

    static FLinearColor NeedColor(float Value)
    {
        return Value >= 55.0f ? Good : (Value >= 25.0f ? Warn : Bad);
    }

    static FString PeriodName(ETamaleTimePeriod Period)
    {
        switch (Period)
        {
        case ETamaleTimePeriod::Morning:   return TEXT("Morning (Dasuba)");
        case ETamaleTimePeriod::Afternoon: return TEXT("Afternoon (Wuntanga)");
        case ETamaleTimePeriod::Evening:   return TEXT("Evening (Zaawuni)");
        default:                           return TEXT("Night");
        }
    }

    static FString WeatherName(ETamaleWeather Weather)
    {
        switch (Weather)
        {
        case ETamaleWeather::Clear:        return TEXT("Clear");
        case ETamaleWeather::Cloudy:       return TEXT("Cloudy");
        case ETamaleWeather::Heat:         return TEXT("Savannah heat");
        case ETamaleWeather::Harmattan:    return TEXT("Harmattan haze");
        case ETamaleWeather::LightRain:    return TEXT("Light rain");
        case ETamaleWeather::Rain:         return TEXT("Rain");
        case ETamaleWeather::Thunderstorm: return TEXT("Thunderstorm");
        default:                           return TEXT("");
        }
    }
}

using namespace TamaleHudStyle;

void ATamaleHUD::ShowToast(const FString& Message, float Seconds)
{
    ToastText = Message;
    ToastExpireTime = GetWorld() ? GetWorld()->GetRealTimeSeconds() + Seconds : 0.0;
}

void ATamaleHUD::DrawPanel(float X, float Y, float W, float H, const FLinearColor& Color)
{
    DrawRect(Color, X, Y, W, H);
}

void ATamaleHUD::DrawLabel(const FString& Text, float X, float Y, UFont* Font, const FLinearColor& Color, float Scale)
{
    // Canvas text does not wrap; draw explicit lines.
    TArray<FString> Lines;
    Text.ParseIntoArrayLines(Lines, false);
    float LineY = Y;
    for (const FString& Line : Lines)
    {
        DrawText(Line, Color, X, LineY, Font, Scale * UiScale);
        float W = 0.0f, H = 0.0f;
        GetTextSize(Line.IsEmpty() ? FString(TEXT(" ")) : Line, W, H, Font, Scale * UiScale);
        LineY += H;
    }
}

float ATamaleHUD::MeasureWidth(const FString& Text, UFont* Font, float Scale)
{
    float W = 0.0f, H = 0.0f;
    GetTextSize(Text, W, H, Font, Scale * UiScale);
    return W;
}

void ATamaleHUD::DrawHUD()
{
    Super::DrawHUD();
    if (!Canvas)
    {
        return;
    }
    UiScale = FMath::Clamp(Canvas->ClipY / 1080.0f, 0.75f, 1.6f);

    if (bDrawStatusPanels)
    {
        DrawStatus();
        DrawNeeds();
        DrawMinimap();
    }
    DrawPrompt();

    if (bShowMap) DrawFullMap();
    if (bShowInventory) DrawInventory();
    if (bShowPause) DrawPause();
    DrawToast();
    DrawDebugFooter();
}

// ---------------------------------------------------------------------------------------------

void ATamaleHUD::DrawStatus()
{
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    const UTamaleTimeOfDaySubsystem* TimeSys = GetWorld()->GetSubsystem<UTamaleTimeOfDaySubsystem>();
    const UTamaleDataRegistrySubsystem* Data = GI ? GI->GetSubsystem<UTamaleDataRegistrySubsystem>() : nullptr;
    const APawn* Pawn = GetOwningPawn();
    UFont* Medium = UEngine::GetMediumFont();
    UFont* Small = UEngine::GetSmallFont();

    const float X = 24.0f * UiScale;
    const float Y = 20.0f * UiScale;
    DrawPanel(X - 12.0f * UiScale, Y - 10.0f * UiScale, 430.0f * UiScale, 118.0f * UiScale);

    if (TimeSys)
    {
        DrawLabel(FString::Printf(TEXT("Day %d   %s   %s"), TimeSys->GetDayCount(), *TimeSys->GetFormattedClock(), *PeriodName(TimeSys->GetCurrentPeriod())),
                  X, Y, Medium, Ink);
        DrawLabel(WeatherName(TimeSys->GetWeather()), X, Y + 24.0f * UiScale, Small, Muted);
    }

    if (GI)
    {
        if (const FTamaleCharacterSaveState* State = GI->FindCharacterState(GI->GetActiveCharacterId()))
        {
            FString Who = State->DisplayName;
            if (Data)
            {
                if (const FTamalePlayableCharacterRow* Row = Data->FindPlayableCharacter(State->CharacterId.ToString()))
                {
                    Who += FString::Printf(TEXT("  -  %s"), *Row->Occupation);
                }
            }
            DrawLabel(Who, X, Y + 44.0f * UiScale, Small, Accent);
            DrawLabel(FString::Printf(TEXT("Cash GHS %d    MoMo GHS %d    Bank GHS %d"), State->MoneyCedis, State->MomoBalanceCedis, State->BankBalanceCedis),
                      X, Y + 64.0f * UiScale, Small, Ink);
        }
    }

    if (Data && Pawn)
    {
        DrawLabel(Data->FindDistrictNameAt(Pawn->GetActorLocation()), X, Y + 84.0f * UiScale, Small, Muted);
    }
}

void ATamaleHUD::DrawNeeds()
{
    const ATamalePlayerCharacter* PlayerChar = Cast<ATamalePlayerCharacter>(GetOwningPawn());
    if (!PlayerChar || !PlayerChar->NeedsComponent)
    {
        return;
    }
    const FTamaleNeedsData& N = PlayerChar->NeedsComponent->Needs;
    const FTamaleHomeStateData& H = PlayerChar->NeedsComponent->HomeState;

    struct FRow { const TCHAR* Name; float Value; };
    const FRow Rows[] = {
        { TEXT("Energy"), N.Energy }, { TEXT("Hunger"), N.Hunger }, { TEXT("Thirst"), N.Thirst },
        { TEXT("Hygiene"), N.Hygiene }, { TEXT("Comfort"), N.Comfort }, { TEXT("Social"), N.Social },
        { TEXT("Clothes"), N.OutfitCleanliness }, { TEXT("Home"), H.HomeCleanliness },
    };

    UFont* Small = UEngine::GetSmallFont();
    const float RowH = 20.0f * UiScale;
    const float BarW = 150.0f * UiScale;
    const float LabelW = 70.0f * UiScale;
    const float X = 24.0f * UiScale;
    constexpr int32 RowCount = UE_ARRAY_COUNT(Rows);
    const float Height = RowH * RowCount + 16.0f * UiScale;
    const float Y = Canvas->ClipY - Height - 20.0f * UiScale;

    DrawPanel(X - 12.0f * UiScale, Y - 8.0f * UiScale, LabelW + BarW + 70.0f * UiScale, Height);
    for (int32 i = 0; i < RowCount; ++i)
    {
        const float RowY = Y + i * RowH;
        const float Value = FMath::Clamp(Rows[i].Value, 0.0f, 100.0f);
        DrawLabel(Rows[i].Name, X, RowY, Small, Muted);
        DrawRect(FLinearColor(1.0f, 1.0f, 1.0f, 0.12f), X + LabelW, RowY + 4.0f * UiScale, BarW, 10.0f * UiScale);
        DrawRect(NeedColor(Value), X + LabelW, RowY + 4.0f * UiScale, BarW * Value / 100.0f, 10.0f * UiScale);
        DrawLabel(FString::Printf(TEXT("%3.0f"), Value), X + LabelW + BarW + 8.0f * UiScale, RowY, Small, Ink);
    }
}

void ATamaleHUD::DrawPrompt()
{
    const ATamalePlayerCharacter* PlayerChar = Cast<ATamalePlayerCharacter>(GetOwningPawn());
    if (!PlayerChar || !PlayerChar->InteractionComponent || bShowMap || bShowPause)
    {
        return;
    }
    AActor* Target = PlayerChar->InteractionComponent->GetFocusedActor();
    if (!Target || !Target->Implements<UTamaleInteractableInterface>())
    {
        return;
    }

    const FString Prompt = ITamaleInteractableInterface::Execute_GetInteractionPrompt(Target, const_cast<ATamalePlayerCharacter*>(PlayerChar)).ToString();
    const FString Subtitle = ITamaleInteractableInterface::Execute_GetDagbaniSubtitle(Target, const_cast<ATamalePlayerCharacter*>(PlayerChar)).ToString();

    UFont* Medium = UEngine::GetMediumFont();
    UFont* Small = UEngine::GetSmallFont();
    TArray<FString> SubLines;
    Subtitle.ParseIntoArrayLines(SubLines, true);

    float Width = MeasureWidth(Prompt, Medium);
    for (const FString& Line : SubLines) Width = FMath::Max(Width, MeasureWidth(Line, Small));
    const float Pad = 14.0f * UiScale;
    const float Height = (30.0f + 18.0f * SubLines.Num()) * UiScale + Pad;
    const float X = (Canvas->ClipX - Width) * 0.5f;
    const float Y = Canvas->ClipY * 0.72f;

    DrawPanel(X - Pad, Y - Pad * 0.5f, Width + Pad * 2.0f, Height, FLinearColor(0.0f, 0.0f, 0.0f, 0.65f));
    DrawLabel(Prompt, X, Y, Medium, Accent);
    float LineY = Y + 28.0f * UiScale;
    for (const FString& Line : SubLines)
    {
        DrawLabel(Line, X, LineY, Small, Ink);
        LineY += 18.0f * UiScale;
    }
}

// ---------------------------------------------------------------------------------------------
// Maps

void ATamaleHUD::DrawWorldInRect(const UTamaleDataRegistrySubsystem& Data, const FVector2D& WorldCenter, double CmPerPixel,
                                 float RectX, float RectY, float RectW, float RectH, bool bLandmarkNames)
{
    const FBox2D ScreenRect(FVector2D(RectX, RectY), FVector2D(RectX + RectW, RectY + RectH));
    const FVector2D ScreenCenter = ScreenRect.GetCenter();

    // North-up: world +X (east) -> screen right, world +Y (south) -> screen down.
    auto ToScreen = [&](const FVector2D& World) { return ScreenCenter + (World - WorldCenter) / CmPerPixel; };
    auto DrawWorldBox = [&](const FBox2D& WorldBox, const FLinearColor& Color, float MinPixels)
    {
        FBox2D S(ToScreen(WorldBox.Min), ToScreen(WorldBox.Max));
        // Keep thin roads visible when zoomed out.
        const FVector2D C = S.GetCenter();
        const double MinPx = MinPixels;
        const FVector2D Half = FVector2D(FMath::Max(S.GetSize().X, MinPx), FMath::Max(S.GetSize().Y, MinPx)) * 0.5;
        S = FBox2D(C - Half, C + Half);
        const FBox2D Clipped(FVector2D(FMath::Max(S.Min.X, ScreenRect.Min.X), FMath::Max(S.Min.Y, ScreenRect.Min.Y)),
                             FVector2D(FMath::Min(S.Max.X, ScreenRect.Max.X), FMath::Min(S.Max.Y, ScreenRect.Max.Y)));
        if (Clipped.Max.X > Clipped.Min.X && Clipped.Max.Y > Clipped.Min.Y)
        {
            DrawRect(Color, Clipped.Min.X, Clipped.Min.Y, Clipped.Max.X - Clipped.Min.X, Clipped.Max.Y - Clipped.Min.Y);
        }
    };
    auto Inside = [&](const FVector2D& P) { return ScreenRect.IsInside(P); };

    DrawRect(MapGround, RectX, RectY, RectW, RectH);

    for (const FTamaleRoadRow& Road : Data.Roads)
    {
        DrawWorldBox(Road.GetFootprint2D(), Road.SurfaceType.Contains(TEXT("Laterite")) ? MapLaterite : MapRoad, 2.0f);
    }
    for (const FTamaleBuildingRow& B : Data.Buildings)
    {
        // Axis-aligned bounds of the rotated footprint.
        const double Yaw = FMath::DegreesToRadians(B.YawDegrees);
        const double Hx = FMath::Abs(FMath::Cos(Yaw)) * B.SizeCm.X * 0.5 + FMath::Abs(FMath::Sin(Yaw)) * B.SizeCm.Y * 0.5;
        const double Hy = FMath::Abs(FMath::Sin(Yaw)) * B.SizeCm.X * 0.5 + FMath::Abs(FMath::Cos(Yaw)) * B.SizeCm.Y * 0.5;
        const FVector2D C(B.CenterLocationCm.X, B.CenterLocationCm.Y);
        DrawWorldBox(FBox2D(C - FVector2D(Hx, Hy), C + FVector2D(Hx, Hy)), B.LandmarkId == TEXT("player_home") ? MapHome : MapBuilding, 1.0f);
    }

    UFont* Small = UEngine::GetSmallFont();
    for (const FTamaleLandmarkRow& L : Data.Landmarks)
    {
        const FVector2D P = ToScreen(FVector2D(L.LocationCm));
        if (!Inside(P)) continue;
        const bool bHome = L.LandmarkId == TEXT("player_home");
        const float Dot = (bHome ? 7.0f : 4.0f) * UiScale;
        DrawRect(bHome ? MapHome : MapLandmark, P.X - Dot * 0.5f, P.Y - Dot * 0.5f, Dot, Dot);
        if (bLandmarkNames && (bHome || L.LandmarkType != TEXT("commercial")))
        {
            DrawLabel(bHome ? FString(TEXT("Home")) : L.DisplayName, P.X + 6.0f * UiScale, P.Y - 8.0f * UiScale, Small, bHome ? MapHome : Ink, 0.85f);
        }
    }

    // Player marker + heading (camera yaw).
    if (const APawn* Pawn = GetOwningPawn())
    {
        const FVector2D P = ToScreen(FVector2D(Pawn->GetActorLocation()));
        if (Inside(P))
        {
            const float Yaw = GetOwningPlayerController() ? GetOwningPlayerController()->GetControlRotation().Yaw : Pawn->GetActorRotation().Yaw;
            const FVector2D Dir(FMath::Cos(FMath::DegreesToRadians(Yaw)), FMath::Sin(FMath::DegreesToRadians(Yaw)));
            const float S = 6.0f * UiScale;
            DrawRect(MapPlayer, P.X - S * 0.5f, P.Y - S * 0.5f, S, S);
            DrawLine(P.X, P.Y, P.X + Dir.X * 16.0f * UiScale, P.Y + Dir.Y * 16.0f * UiScale, MapPlayer, 2.5f * UiScale);
        }
    }
}

void ATamaleHUD::DrawMinimap()
{
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    const UTamaleDataRegistrySubsystem* Data = GI ? GI->GetSubsystem<UTamaleDataRegistrySubsystem>() : nullptr;
    const APawn* Pawn = GetOwningPawn();
    if (!Data || !Pawn || bShowMap)
    {
        return;
    }
    const float Size = 230.0f * UiScale;
    const float X = Canvas->ClipX - Size - 24.0f * UiScale;
    const float Y = 20.0f * UiScale;
    DrawPanel(X - 4.0f, Y - 4.0f, Size + 8.0f, Size + 8.0f, FLinearColor(0.0f, 0.0f, 0.0f, 0.7f));
    DrawWorldInRect(*Data, FVector2D(Pawn->GetActorLocation()), (MinimapRadiusCm * 2.0) / Size, X, Y, Size, Size, false);
    DrawLabel(TEXT("N"), X + Size * 0.5f - 4.0f * UiScale, Y + 2.0f * UiScale, UEngine::GetSmallFont(), Accent);
    DrawLabel(TEXT("M - city map"), X, Y + Size + 8.0f * UiScale, UEngine::GetSmallFont(), Muted, 0.85f);
}

void ATamaleHUD::DrawFullMap()
{
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    const UTamaleDataRegistrySubsystem* Data = GI ? GI->GetSubsystem<UTamaleDataRegistrySubsystem>() : nullptr;
    if (!Data)
    {
        return;
    }
    DrawRect(FLinearColor(0.0f, 0.0f, 0.0f, 0.6f), 0, 0, Canvas->ClipX, Canvas->ClipY);

    const FBox2D World = Data->GetWorldBounds2D().ExpandBy(1500.0);
    const float Size = FMath::Min(Canvas->ClipX, Canvas->ClipY) * 0.86f;
    const float X = (Canvas->ClipX - Size) * 0.5f;
    const float Y = (Canvas->ClipY - Size) * 0.5f;
    const double CmPerPixel = FMath::Max(World.GetSize().X, World.GetSize().Y) / Size;
    DrawWorldInRect(*Data, World.GetCenter(), CmPerPixel, X, Y, Size, Size, true);

    UFont* Medium = UEngine::GetMediumFont();
    DrawLabel(TEXT("Tamale - city map (M to close)"), X, Y - 30.0f * UiScale, Medium, Accent);
    DrawLabel(TEXT("Blue = you   Green = home   Gold = landmarks   N is up.   GPS routing arrives in Batch 9."),
              X, Y + Size + 8.0f * UiScale, UEngine::GetSmallFont(), Muted);
}

// ---------------------------------------------------------------------------------------------

void ATamaleHUD::DrawInventory()
{
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    const ATamalePlayerCharacter* PlayerChar = Cast<ATamalePlayerCharacter>(GetOwningPawn());
    const FTamaleCharacterSaveState* State = GI ? GI->FindCharacterState(GI->GetActiveCharacterId()) : nullptr;

    const float W = 520.0f * UiScale;
    const float H = 300.0f * UiScale;
    const float X = (Canvas->ClipX - W) * 0.5f;
    const float Y = (Canvas->ClipY - H) * 0.5f;
    DrawPanel(X, Y, W, H, FLinearColor(0.05f, 0.04f, 0.03f, 0.9f));

    UFont* Medium = UEngine::GetMediumFont();
    UFont* Small = UEngine::GetSmallFont();
    const float P = 20.0f * UiScale;
    DrawLabel(TEXT("Inventory (I to close)"), X + P, Y + P, Medium, Accent);
    if (State)
    {
        DrawLabel(FString::Printf(TEXT("%s\nCash GHS %d   MoMo GHS %d   Bank GHS %d"), *State->DisplayName, State->MoneyCedis, State->MomoBalanceCedis, State->BankBalanceCedis),
                  X + P, Y + P + 36.0f * UiScale, Small, Ink);
    }
    if (PlayerChar && PlayerChar->NeedsComponent)
    {
        const FTamaleHomeStateData& Home = PlayerChar->NeedsComponent->HomeState;
        DrawLabel(FString::Printf(TEXT("Home: %s\nDirty dishes %d   Rubbish %d   Dirty clothes %d   On the line %d"),
                                  *Home.HomeName, Home.DirtyDishesCount, Home.RubbishCount, Home.DirtyClothesCount, Home.HangingLaundryCount),
                  X + P, Y + P + 90.0f * UiScale, Small, Ink);
    }
    DrawLabel(TEXT("Items, groceries and purchases are not migrated yet.\nThey arrive with the economy & shops batch (Batch 7)."),
              X + P, Y + H - 70.0f * UiScale, Small, Muted);
}

void ATamaleHUD::DrawPause()
{
    DrawRect(FLinearColor(0.0f, 0.0f, 0.0f, 0.65f), 0, 0, Canvas->ClipX, Canvas->ClipY);
    UFont* Large = UEngine::GetLargeFont();
    UFont* Small = UEngine::GetSmallFont();
    const FString Title = TEXT("PAUSED");
    DrawLabel(Title, (Canvas->ClipX - MeasureWidth(Title, Large)) * 0.5f, Canvas->ClipY * 0.28f, Large, Accent);

    const FString Help =
        TEXT("WASD move    Mouse look    Wheel zoom    Shift run    Space jump    Ctrl crouch\n")
        TEXT("E interact    M map    I inventory    1-6 switch character    F5 save    F9 load\n")
        TEXT("Esc / P resume  (in the editor's Play-In-Editor, Esc stops play - use P)");
    float Widest = 0.0f;
    TArray<FString> Lines;
    Help.ParseIntoArrayLines(Lines);
    for (const FString& L : Lines) Widest = FMath::Max(Widest, MeasureWidth(L, Small));
    DrawLabel(Help, (Canvas->ClipX - Widest) * 0.5f, Canvas->ClipY * 0.4f, Small, Ink);
}

void ATamaleHUD::DrawToast()
{
    if (ToastText.IsEmpty() || !GetWorld() || GetWorld()->GetRealTimeSeconds() > ToastExpireTime)
    {
        return;
    }
    UFont* Medium = UEngine::GetMediumFont();
    const float W = MeasureWidth(ToastText, Medium);
    const float X = (Canvas->ClipX - W) * 0.5f;
    const float Y = 70.0f * UiScale;
    DrawPanel(X - 16.0f * UiScale, Y - 8.0f * UiScale, W + 32.0f * UiScale, 40.0f * UiScale, FLinearColor(0.0f, 0.0f, 0.0f, 0.7f));
    DrawLabel(ToastText, X, Y, Medium, Ink);
}

void ATamaleHUD::DrawDebugFooter()
{
    UTamaleGameInstance* GI = Cast<UTamaleGameInstance>(GetGameInstance());
    const UTamaleDataRegistrySubsystem* Data = GI ? GI->GetSubsystem<UTamaleDataRegistrySubsystem>() : nullptr;
    if (!Data)
    {
        return;
    }
    const FString Footer = FString::Printf(TEXT("TAMALE 3D UE5 greybox  |  data %d/13 tables, %d issues  |  road networks: %d"),
                                           Data->LoadedTableCount, Data->ValidationIssues.Num(), Data->RoadNetworkComponentCount);
    UFont* Small = UEngine::GetSmallFont();
    const FLinearColor Color = Data->ValidationIssues.Num() == 0 && Data->LoadedTableCount == 13 ? Muted : Bad;
    DrawLabel(Footer, Canvas->ClipX - MeasureWidth(Footer, Small, 0.8f) - 16.0f * UiScale, Canvas->ClipY - 26.0f * UiScale, Small, Color, 0.8f);
}
